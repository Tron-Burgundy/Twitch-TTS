/**
 * A version of the class that's a mix of the original using its own queue and the Speakerbot
 * version.  Rather than being an emitter it will use the global emitter
 *
 * I need to update the original to do process queue in resume()
 */

import EVENTS from "../event-constants.mod.js";

const GETVOICES_MAX_TIMEOUT = 3000;
const GETVOICES_CHECK_PERIOD = 250;

const VOICE_MAX_MINS = {
   pitch: {min: 0.5, max: 2.0, default: 1.0},
   rate: {min: 0.1, max: 10.0, default: 1.0},
   volume: {min: 0.0, max: 1.0, default: 1.0}
}


const utteranceEventTypes = ['boundary', 'end', 'error', 'mark', 'pause', 'resume', 'start']
const utteranceEventTypesLess = ['end', 'error', 'start', 'pause', 'resume']
const SPEECHER_LOGGING = false;
const SPEECHER_log = SPEECHER_LOGGING ? console.debug : l => l;	// if you don't want logging

export default class SpeecherRevamped {
    ss = window.speechSynthesis;    // shortcut to window.speechSynthesis

    speechQueueMap = new Map();		// IDs lets us easily delete / add
    speechQueueIdBackup = 0;

    utterance = null; 		// new SpeechSynthesisUtterance();
    oldUtterance = null;	// to stop the old utterance being garbage collected before end event
    voices = [];
    voiceMap = {};  // indexed by voiceURI

    voiceDefault = null;

    #isSpeaking = false;
    #isPaused = false;

    initialised = false;
    gotVoicesDebug = [];	// set with a string about how the voices were found

    #voicesChangedGetOnTimerInterval = null;	// for using the timer
    #voicesPromise = null;
    #voicesPromiseResolve = null;

    #readyResolve = null;
    #readyReject = null;
    #amIReadyPromise = null;

    #cancelNextSpeak = false;


    constructor(args = {maxTimeout: GETVOICES_MAX_TIMEOUT, period: GETVOICES_CHECK_PERIOD}) {
        this.ss.cancel();	// necessary if paused before reloading page
        //this.ss.resume();
        this.#amIReadyPromise = new Promise( (res, rej) => {
            this.#readyResolve = res;
            this.#readyReject = rej;
        });

        this.#set_onvoices_changed_handler();
        this.#voicesInitOnTimer(args);
        this.add_event_listeners(); // bonkers
    }

        // before I put packs into the queue.  Should I put utterances?  I don't like the idea of the
        // resources being pre made
        /**
         * Pack can contain saynext or immediate properties to put them to the front of the queue or immediately interrupt
         * @param {object} pack from a twitch:message with extras of pitch, rate, voice
         * @param {*} utteranceData will be merged with the utterance
         * @returns
         */

    speak(pack) {
        this.stopNow = false;
        let msgId = pack.messageid ?? this.speechQueueIdBackup++;

        if (pack.saynext) {
            this.speechQueueMap = new Map( [ [msgId, pack], ...this.speechQueueMap ] );
        } else {
            this.speechQueueMap.set(msgId, pack);
        }

        SPEECHER_log("Speech Queue", this.speechQueueMap.size);
        this.sayQueueProcess(pack.immediate);
    }


    sayQueueProcess(immediate = false) {
        if ( !immediate && (this.ss.speaking || this.#isPaused) ) { //  || this.#isSpeaking
            //cclog("Can't speak... eating", "r");
            return;
        }

        this.#isSpeaking = false;
        this.currentSpeakingID = "not in use";

        if (this.stopNow) {
            this.ss.cancel();
            return;
        }

        for ( const [id, pack] of this.speechQueueMap.entries() ) {
            this.speechQueueMap.delete(id); // needs to happen immediately
                                                                                    //console.log("HOW ABOUT", pack);
            let utterance = this.#create_utterance(pack);//, utteranceData);
                                                                                    //console.log("Utterance created:", utterance);
            if (utterance === false) {
                this.emit(EVENTS.SPEECHER_REJECTING, pack);
                cclog("REJECT REJECT UTTERANCE REJECT:", "m");
                console.log("pack for reject", pack);
                continue;
            }

                // ABOVE process utterance sets this.utterance
            utterance.lang = utterance.voice?.lang ? utterance.voice.lang : 'en-GB';  // Android needs lang

            this.utterance = utterance;
            this.currentSpeakingID = id;
                // emit that we're about to speak and check for a cancel
                // listeners can call this.cancel_next() to stop this utterance
            this.#cancelNextSpeak = false;
            this.emit(EVENTS.SPEECHER_BEFORE_SPEAK, { messageid: id, utterance });
            if (this.#cancelNextSpeak) {
                this.emit(EVENTS.SPEECHER_CANCELLED, utterance);
                continue;
            }

            this.#isSpeaking = true;
            this.ss.speak(this.utterance)
            this.ss.resume();	// this has been necessary, I think

            break;
        }
    }


    #create_utterance(pack, extraData = {}) {
        this.oldUtterance = this.utterance;
        let u = new SpeechSynthesisUtterance(pack.message);	// might be the garbage collection issue
        let pFiltered = this.#validate_params(pack);

        this.#utterance_add_handlers( u );

        // u.pitch = pFiltered.pitch;
        // u.rate = pFiltered.rate;
        // u.voice = pFiltered.voice;  // validate selects the voice
                    //u.volume = pFiltered.volume;
        u.messageid = pack.messageid;
        u.customdata = pack;

        return u;
    }

        // makes sure the voice, pitch and rate are within limits

    #validate_params(params) {
        let filtered = { };

        let vUri = params.voiceURI;
        //filtered.voice = this.voiceMap[vUri] ?? this.voiceDefault;
        filtered.voice = params.voice?.constructor === SpeechSynthesisVoice ?? this.voiceDefault;

        for (const key in VOICE_MAX_MINS) {
            const test = VOICE_MAX_MINS[key];
            filtered[key] = test.default;
            if (key in params) {
                let p = parseFloat( params[key] );
                if (p >= test.min && p <= test.max) {
                    filtered[key] = p;
                }
            }
        }

        return filtered;
    }

        // adds handlers for utterance events start end error pause resume

    #utterance_add_handlers(utterance) {
        for (let ev of utteranceEventTypesLess) {
            utterance.addEventListener(ev, this.utEmit);
        }
    }

        /**
         * Added for utterance events start end error pause resume
         * emits speecher:start speecher:end etc.
         * On error adding an error property to the utterance destroys it.  For this reason a { pack } is used.
         * @param {SpeechSynthesisEvent} e
         */

    utEmit(e) {
        let utterance = e.target;
        let pack = {messageid: utterance.messageid, utterance: e.utterance}
        if (e.type === "error") pack.error = e.error;

        TT.emit("speecher:" + e.type, pack);
    }

    #create_voicemap() {
        this.voices = this.ss.getVoices();
        this.voiceMap = {};
        this.voices.map(v => this.voiceMap[v.voiceURI] = v);
    }

    #voices_changed(voices, data = "") {
        this.gotVoicesDebug.push(data);	// debug log
        SPEECHER_log(data);

        this.voices = voices;
        this.#create_voicemap();
        this.emit(EVENTS.SPEECHER_VOICES_CHANGED, data);
        this.#imReady();
    }

    #voicesInitOnTimer(args) {
        let {maxTimeout, period} = args;
        let iTmrMSecs = 0;

        this.#voicesPromise = new Promise((voicesPromiseResolve, voicesPromiseReject) => {
            this.#voicesPromiseResolve = voicesPromiseResolve;

            const _timerIntervalHandler = () => {
                let voices = this.ss.getVoices();

                SPEECHER_log("- IN INTERVAL TIMER period", iTmrMSecs, "voices: ", voices.length, "current", this.voices.length);
                    // actually let's keep the timer running
                if (voices.length !== this.voices.length) {
                    let msg = `VoiceGetTimer change on period ${iTmrMSecs}ms found ${voices.length}, previously : ${this.voices.length}`
                    this.#voices_changed(voices, msg);
                }

                iTmrMSecs += period;
                if (iTmrMSecs > maxTimeout) {
                    clearInterval(this.#voicesChangedGetOnTimerInterval);

                    if (!this.initialised) {
                        this.gotVoicesDebug.push( "FAIL: MAXED OUT" );
                        this.initialised = true;
                        voicesPromiseResolve(false);
                        this.#readyResolve(false);
                    }
                }
            }

            this.#voicesChangedGetOnTimerInterval =  setInterval( _timerIntervalHandler, period);
            _timerIntervalHandler();
        })
    }

        //

    #set_onvoices_changed_handler() {
        let count = 1;

        if (hasProperty(this.ss, 'onvoiceschanged')) {
            this.ss.addEventListener('voiceschanged', e => {
                let voices = this.ss.getVoices();
                let msg = `voiceschanged ${e.timeStamp}ms on event #${count} with ${voices.length} found.`;
                SPEECHER_log("** ONVOICESCHANGED :", msg);

                if (voices.length !== this.voices.length) {
                    this.#voices_changed(voices, msg);
                }
                count++;
            });
        }
    }


    add_event_listeners() {
        TT.emitter.on("speecher:end", x => this.sayQueueProcess());
        TT.emitter.on("speecher:error", x => this.sayQueueProcess());
    }


        ///// FLIM FLAM METHODS ////
        ///// FLIM FLAM METHODS ////

    emit(event, data) {
        TT.emit(event, data);
    }

    getVoices() {
        if (this.initialised) {
            return this.ss.getVoices();	// should I use ss?
        }
        return this.#voicesPromise;
    }


    #imReady() {
        this.#find_default_voice();
        this.initialised = true;

        this.#readyResolve(true);
        this.#voicesPromiseResolve(this.voices);

        this.emit(EVENTS.SPEECHER_READY);
    }


        // this could emit for every message deleted...
    cancel_user_messages(username) {
        username = username.toLowerCase();
        // console.log("CANCEL USER MESSAEGS GOT", username);
        // console.log("UTTERANCE NOW", this.utterance);
        let count = 0;
        if (this.utterance?.customdata.userLower === username) this.cancel();
        this.speechQueueMap.forEach( (value, key, map) => {
            if (value.userLower === username) {
                this.cancel_id(key);
                count++;
            }
        });

        return count;
    }

        // cancels a message with the id
    cancel_id(id) {
        this.speechQueueMap.delete( id );

        if ( this.currentSpeakingID === id ) {
            this.ss.cancel();			// this will trigger an error:interrupted
            this.#isSpeaking = false;
            this.emit(EVENTS.SPEECHER_CANCELLED_CURRENT, {"id" : id,
                "utterance" : this.utterance
            });
            //this.currentSpeakingID = -1;
            // not needed as error handles it this._sayQueueProcess();	// don't know if I need this, does cancel fire the end event?

            return true;
        }

        return false;
    }

    #find_default_voice() {
        let v =	this.voices.find(v => v.default);

        if (!v) {
            let lang = navigator.language || navigator.languages[0] || navigator.userLanguage;
            v = this.voices.find(v => v.lang === lang);
        }
        if (!v) {
            v = this.voices[0];
        }

        this.voiceDefault = v;
    }

        // returns promise of true / false
    ready() {
        return this.#amIReadyPromise;
    }

    speaking() {
        return this.ss.speaking;
    }

    stop() {
        this.#isSpeaking = false;
        this.stopNow = true;
        this.ss.cancel();
    }

    pause() {			//this.stopNow = true;
        //this.isSpeaking = false;	// UNSURE
        this.#isPaused = true;
        this.ss.pause();
    }

    resume() {			//this.stopNow = false;
        this.#isPaused = false;
        this.ss.resume();
        this.sayQueueProcess(); // if it's paused speechSynthesis is still classed as speaking so this is fine
    }

        // cancels the current speaking voice - end event will trigger
    cancel() {
        this.ss.cancel();
    }

        // call in a beforespeak event to cancel the next said thing

    cancel_next() {
        this.#cancelNextSpeak = true;
    }

        //
    reset() {
        this.clear()
        this.cancel();
    }
        // empties the queue
    clear() {
        this.speechQueueMap.clear();
    }
// CLASS ENDS
}