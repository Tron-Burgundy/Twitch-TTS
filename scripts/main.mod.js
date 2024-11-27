/**
 * I'm the boss.  I do things
 *
 * Should classes at their own listeners or should I pass them on?
 */
window.TT = window.TT ?? {};

import Emitter from "./classes/emitter.class.js"
import TTSMsgDisplay from "./classes/messageDisplay.class.js"
import SpeecherRevamped from "./classes/speecherRevamped.class.js";
import EVENTS from "./event-constants.mod.js";
import { restore_form_values } from "./form-saver.mod.js";
import { add_form_element_listeners, FORM_EVENT_HANDLERS_POST } from "./form-events.mod.js";
import { init_tag_pools, create_tag_pools } from "./tag-pools.mod.js";
import { populate_voice_selects } from "./voice-selects-setup.mod.js";
import { create_commands_voice_map } from "./voice-selects-setup.mod.js";
import { stop_go_icon_off, stop_go_icon_on } from "./view.mod.js";


const queryStringOnLoad = window.location.search;
TT.queryStringOnLoad = queryStringOnLoad;
window._originalQS = queryStringOnLoad;

let emitter = new Emitter();
TT.emitter = emitter;
TT.on = emitter.on.bind(emitter);
TT.emit = function (x,y) { emitter.emit(x, y); }
    //TT.emit = emitter.emit; // can't do this.  Cannot read private member #eventDummy from an object whose class did not declare it.  You'd have to bind anyway

TT.lastUser = "";
TT.lastChannel = "";
TT.lastMessageTime = 0; // milliseconds from Twitch message

let msgDisp = new TTSMsgDisplay();
export const speech = new SpeecherRevamped();
window.s = speech; window.m = msgDisp;  // DEBUG


window.addEventListener("load", async function main() {
    cclog("Main is happening", "g");

    add_speecher_events();
    add_general_events();

    await speech.ready();

    // MUST be before restoring values - unless the voice values also map to hidden field
    populate_voice_selects();
// add fn to load defaults if load defaults if fallback empty fallback?
    restore_form_values();

    init_tag_pools();
    create_tag_pools();

    add_form_element_listeners();

    TT.allchange();
        // this listener is added post initial changes because it triggers a lot of activity
    add_form_element_listeners(FORM_EVENT_HANDLERS_POST);

    create_commands_voice_map();


    stupid_test_guff(); // WARNING: takes out anything starting with X

    //TT.emit(EVENTS.SPEECH_RESUMED);
    TT.emit(EVENTS.SPEECH_ENABLED);
    //TT.emit(EVENTS.SPEECH_DISABLED);
});


    /**
     *
     * @param {object} pack emitted from the twitch message distributor
     * @returns
     */

function on_twitch_message(pack) {    // permissions could be done here to remove it from the message bleater.  No. Emotes and perms are Twitch related, leave them there
    if (TT.config.chatEnabled === false) return;
    if (TT.config.speechQueueLimit !== 0 & speech.speechQueueMap.size >= TT.config.speechQueueLimit) return;

    pack = pack.detail;
    let {channel, userid, userLower} = pack;
    let messageTime = pack.userstate["tmi-sent-ts"];




        // do BEFORE speech
    msgDisp.speech_queue_add_entry(pack);   // this or emit a different message queueingmessage

    let hasVoiceCmd = starts_with_voice_command(pack.message);

    if (hasVoiceCmd) {
        pack.message = hasVoiceCmd.stripped;
        pack.voiceCmd = hasVoiceCmd.voiceCmd;
    }

     if (TT.config.chatNoNameRepeatSeconds === 0 ||
        TT.lastUser !== userid ||
        messageTime - TT.lastMessageTime >= TT.config.chatNoNameRepeatSeconds * 1000 ||
        channel !== TT.lastChannel
    ) {        // dressup message
        add_speech_before_after(pack);
    }

    //console.log("pack AFTER", pack);

    speech.speak(pack);

    TT.lastChannel = channel; TT.lastUser = userid; TT.lastMessageTime = messageTime;
}

    /**
     *  Checks if a message starts with a know voice command
     * @param {string} message
     * @returns false or {voiceCmd, stripped}  e.g. voiceCmd: "ftn", "I no longer start !ftn"
     */

function starts_with_voice_command(message) {
    if (message[0] !== "!") return false;
    let start = message.substring(1).split(" ", 1)[0].toLowerCase();

    let voiceExists = TT.config.autoVoiceMap.hasOwnProperty(start);

    if (voiceExists) {    // 2 because of the ! and first space
        return {voiceCmd: start, stripped: message.substring(2 + start.length)}
    }

    return false;
}

function add_general_events() {
    TT.emitter.on(EVENTS.TWITCH_MESSAGE, on_twitch_message);
    TT.emitter.on(EVENTS.MESSAGE_DELETED, on_message_deleted);
    TT.emitter.on(EVENTS.USER_IGNORED, on_user_ignored);
    TT.emitter.on(EVENTS.USER_UNIGNORED, on_user_unignored);
    TT.emitter.on(EVENTS.SPEECH_DISABLED, on_speech_disabled);
    TT.emitter.on(EVENTS.SPEECH_ENABLED, on_speech_enabled);
    TT.emitter.on(EVENTS.SPEECH_PAUSED, on_speech_paused);
    TT.emitter.on(EVENTS.SPEECH_RESUMED, on_speech_resumed);

    TT.emitter.on(EVENTS.QUERY_PARAMS_CHANGED, on_query_params_change);
    TT.emitter.on(EVENTS.QUERY_PARAMS_UNCHANGED, on_query_params_unchanged);
}

function add_speecher_events() {
    TT.emitter.on("speecher:cancelled", on_speech_cancelled);
    TT.emitter.on("speecher:error", on_speech_error);
    TT.emitter.on("speecher:start", on_speech_started);
    TT.emitter.on("speecher:end", on_speech_ended);

    // having prune on before speak means it can allow one extra in

    TT.emitter.on(EVENTS.SPEECHER_BEFORE_SPEAK, e => {
        if (TT.config.speechQueueOldLimit > 0)
            msgDisp.speech_queue_old_prune(TT.config.speechQueueOldLimit -1);

        let ut = e.detail.utterance;
            // check if the utterance had the voice command added or if the user has one
        let autoVoiceCmd = ut.customdata.voiceCmd || TT.config.userAutoVoices[ut.customdata.userLower];
        let voicePack = TT.config.autoVoiceMap[autoVoiceCmd] || TT.config.autoVoiceMap[undefined];

            // I used to clamp this but fuck it.
        if (voicePack) {
            ut.rate = voicePack.rate;
            ut.pitch = voicePack.pitch;
            ut.voice = voicePack.voice;
        }

        ut.volume = TT.config.volumemaster / 100.0;
    });
}

function on_speech_started(e) {
    //console.log("STARTED", e.detail);
    //msgDisp.speaking_start(e);
}

function on_speech_ended(e) {
    //console.log("ENDED", e.detail);
    msgDisp.speech_queue_entry_to_old_messages(e.detail.messageid, "ended", "link");
}

function on_speech_error(e) {
    e = e.detail;
    let tagMsg = "ERROR", tagCol = "danger";

    switch (e.error) {
        case "not-allowed":
            tagMsg = "not allowed"; tagCol = "warning";
            break;
        case "interrupted":
            tagMsg = "interrupted"; tagCol = "success";
            break;

        default:
            cclog("IMPORTANT: unknown error event:" + e.error, "m");
            break;
    }
    msgDisp.speech_queue_entry_to_old_messages(e.messageid, tagMsg, tagCol);
}

function on_speech_cancelled(e) {
    msgDisp.speech_queue_entry_to_old_messages(e.detail.messageid, "Cancelled", "warning");
}

function on_message_deleted(e) {
    console.log("cancelling id", e.detail.messageid);
    speech.cancel_id(e.detail.messageid);
    msgDisp.remove_msg(e.detail.messageid);   // oh no you don't!
}

function on_speech_disabled() {
    speech.clear();
    speech.cancel();
    msgDisp.speech_queue_all_to_old_messages();

    TT.config.chatEnabled = false;
    gid("enablespeech").checked = false;

    stop_go_icon_off();
    on_speech_paused();
}

function on_speech_enabled() {
    gid("stopgoicon").dataset["icon"] = "power-off";
    gid("enablespeech").checked = true;
    TT.config.chatEnabled = true;
    //on_speech_resumed();
    stop_go_icon_on();
}

// const ICON_OFF_CLASS  = "has-background-danger-50";
// const ICON_ON_CLASS = "has-background-warning-50";


function on_speech_paused() {
    gid("playpauseicon").dataset["icon"] = "play";
    gid("pausespeech").checked = true;
    TT.config.chatPaused = true;
    speech.pause();
}

function on_speech_resumed() {
    gid("playpauseicon").dataset["icon"] = "pause";
    gid("pausespeech").checked = false;
    TT.config.chatPaused = false;

    speech.resume();
        // let it start the engine if disabled
    if (TT.config.chatEnabled === false ) on_speech_enabled();
}

function on_user_ignored(e) {
    console.log("IGNORED DATA", e);
    let deleted = speech.cancel_user_messages(e.detail.user);
    // toast("Deleted " + deleted + " messages for that bastard");
    msgDisp.ignore_user(e.detail.user);   // oh no you don't!
}

function on_user_unignored(e) {
    msgDisp.unignore_user(e.detail.user);   // oh no you don't!
}

function on_query_params_change(e) {
    gid("savewarning").classList.remove("is-hidden");
}

function on_query_params_unchanged(e) {
    gid("savewarning").classList.add("is-hidden");
}

        // adds tagged strings before and after the message and names to nicknames
        // userstate has tmi-sent-ts unix milliseconds

function add_speech_before_after(pack) { //msg, state, channel) {
    if (TT.config.chatSayBefore || TT.config.chatSayAfter) {
        let {userLower, userCaps, channel} = pack;

        if (TT.config.nicknames[userLower]) {
            userCaps = TT.config.nicknames[userLower];
        }
        else {  // if no digits in username
            if ( !TT.config.chatReadNameDigits ) {
                userCaps = userCaps.replace(/\d/g, ' ');
            }
                // camelCase names are more likely to be read correctly
                // and even more correctly if spaced e.g. MyNameIsBob -> My Name Is Bob
            userCaps = userCaps.replaceAll("_", " ");
            const reggie = /([a-z]+)([A-Z])/g;
            userCaps = userCaps.replace(reggie, "$1 $2");
        }

        channel = channel.substring(1); // get rid of #

        let sBefore = TT.config.chatSayBefore.replace(/{channel}/ig, channel).replace(/{user}/ig, userCaps);
        let sAfter = TT.config.chatSayAfter.replace(/{channel}/ig, channel).replace(/{user}/ig, userCaps);
        // MUTATE the pack's message
        pack.message = sBefore + ' ' + pack.message + ' ' + sAfter;
    }

    //return msg;
}

function stupid_test_guff() {
// TT.emitter.on("twitch:message", x => {console.log("twitch:message", x);});
//TT.emitter.on("test", x => {console.log("test", x.detail);});

    TT.emitter.addAllEventsListener(x => {
        if (x.type === "undefined") {
            cclog("EMERGENCY: event type is undefined BELOW");
        }
    });

    return;

    TT.emitter.on(EVENTS.SPEECHER_BEFORE_SPEAK, e => {    // just for a laugh
        if (e.detail.utterance.text.startsWith("x")) {
            cclog("I don't like XX", "b");
            speech.cancel_next();
        }
    });

    // nope, can't remove a closure like this
    TT.emitter.removeAllEventsListener(x => {console.log("I listen to EVERYTHING", x.type, x.detail);});
        // can do this, though
    let foo = x => console.log("All events #2");
    TT.emitter.addAllEventsListener(foo);
    TT.emitter.removeAllEventsListener(foo);

    let bar = x => console.log("I LISTEN ONCE< YEAH?");
    TT.emitter.once("twitch:message", bar)
    TT.emitter.once("twitch:message", x => console.log("ONCE on a closure?"));
}

TT.allchange = function(sel = ".form-save") {
    let ev = new Event("change");
    let ev2 = new Event("input");
    let inps = qsa(sel);
    for(let i of inps) {
        i.dispatchEvent(ev);
        i.dispatchEvent(ev2);
    }
}

    /** Warn if settings need changing */

window.addEventListener('beforeunload', x => {
    console.log("beforeunloadevent", x);
    if (queryStringOnLoad !== window.location.search) {
        TT.show_modal("saveWarning");
        x.preventDefault()
    }
});

    ///////// DEBUGGING /////////
    ///////// DEBUGGING /////////
    ///////// DEBUGGING /////////

function all_event_listener(x) {
    if (x.type === EVENTS.TWITCH_MESSAGE) return;
    console.log("I listen to EVERYTHING", x.type, x.detail);
}

window._eon = function() {
    TT.emitter.addAllEventsListener(all_event_listener);
}

window._eoff = function() {
    TT.emitter.removeAllEventsListener(all_event_listener);
}