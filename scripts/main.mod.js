/**
 * I'm the boss.  I do things
 *
 * Should classes at their own listeners or should I pass them on?
 */
window.TT = window.TT ?? {};
const JANKED = window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost" ? true : false;    // a percentage could also be added

window._j = JANKED;

import Emitter from "./classes/emitter.class.js"
import "./widget-init.mod.js";
import "./tmi/twitch-message-distributor.mod.js";
import TTSMsgDisplay from "./classes/messageDisplay.class.js"
import SpeecherRevamped from "./classes/speecherRevamped.class.js";
import EVENTS from "./event-constants.mod.js";
import { restore_form_values } from "./form-saver.mod.js";
import { add_form_element_listeners, FORM_EVENT_HANDLERS_POST } from "./form-events.mod.js";
import { init_tag_pools, create_tag_pools } from "./tag-pools.mod.js";
import { populate_voice_selects } from "./voice-selects-setup.mod.js";
import { create_commands_voice_map } from "./voice-selects-setup.mod.js";
import { stop_go_icon_off, stop_go_icon_on } from "./view.mod.js";
import { NAME_DIGITS_REMOVE_REGEX } from "./config.mod.js";
import { REPLACE_EVENTS } from "./replace-terms.mod.js";


const queryStringOnLoad = window.location.search;
TT.queryStringOnLoad = queryStringOnLoad;
window._originalQS = queryStringOnLoad;

let emitter = new Emitter();
TT.emitter = emitter;
TT.emit = function (x,y) { emitter.emit(x, y); }
    //TT.emit = emitter.emit; // can't do this.  Cannot read private member #eventDummy from an object whose class did not declare it.  You'd have to bind anyway

TT.lastUser = ""; TT.lastChannel = ""; TT.lastMessageTime = 0; // milliseconds from Twitch message

let msgDisp = new TTSMsgDisplay();
export const speech = new SpeecherRevamped();
window.s = speech; window.m = msgDisp;  // DEBUG


window.addEventListener("load", async function main() {
    cclog("Main is happening", "g");

    add_speecher_events();
    add_general_events();
    add_twitch_moderation_events();

    await speech.ready();

    // MUST be before restoring values - unless the voice values also map to hidden field
    populate_voice_selects();

    restore_form_values();

    init_tag_pools();
    create_tag_pools();
        // ones that won't go crazy on allchange
    add_form_element_listeners();
    add_form_element_listeners(REPLACE_EVENTS);

        // this will trigger config population
    TT.allchange();
        // these listeners is added post initial changes because it triggers a lot of activity
    add_form_element_listeners(FORM_EVENT_HANDLERS_POST);

    create_commands_voice_map();

    TT.emit(EVENTS.SPEECH_ENABLED);
    //TT.emit(EVENTS.SPEECH_RESUMED);
    //TT.emit(EVENTS.SPEECH_DISABLED);
});


    /**
     * A message is ready to be spoken
     * @param {object} pack emitted from the twitch message distributor message, messageOriginal, userstate etc
     * @returns
     */

function on_twitch_message(pack) {    // permissions could be done here to remove it from the message bleater.  No. Emotes and perms are Twitch related, leave them there
    if (TT.config.chatEnabled === false) return;
    if (TT.config.speechQueueLimit !== 0 & speech.speechQueueMap.size >= TT.config.speechQueueLimit) return;

    pack = pack.detail;
    let {channel, userid, userLower} = pack;
    let messageTime = pack.userstate["tmi-sent-ts"];

        // do BEFORE speech: check voice command, check removal of general command - name digits are done in the say before

    let hasVoiceCmd = starts_with_voice_command(pack.message);

    if (hasVoiceCmd) {
        pack.message = hasVoiceCmd.stripped;
        pack.voiceCmd = hasVoiceCmd.voiceCmd;// checked for in beforespeak to add the voice to the utterance
    } else if (pack.message[0] === "!" && TT.config.chatReadCommands === false) {
        return;
    }

        // it's all happening - there will be a speak

    msgDisp.speech_queue_add_entry(pack);   // this or emit a different message queueingmessage

        // replace regex terms before atted name conversion
    pack.message = regex_term_replace(pack.message);

        // convert atted names
    pack.message = atted_names_convert(pack.message);
    if (TT.config.chatFilterChars.length)
        pack.message = pack.message.replace(TT.charFilterRegex, ' ');

    if (TT.config.chatNoNameRepeatSeconds === 0 || messageTime - TT.lastMessageTime >= TT.config.chatNoNameRepeatSeconds * 1000
        || TT.lastUser !== userid ||  channel !== TT.lastChannel) {        // dressup message
        add_speech_before_after(pack);
    }

    if (JANKED) {
        let vCmd = hasVoiceCmd.voiceCmd ?? TT.config.userAutoVoices[pack.userLower];
        if (vCmd && TT.config.autoVoiceMap[vCmd])//vCmd)  // the default "undefined" indexed voice never gets text added
            TT.config.autoVoiceMap[vCmd].text = pack.message;
    }

        // all of the pack data becomes the utterance customdata
    speech.speak(pack);

    TT.lastChannel = channel; TT.lastUser = userid; TT.lastMessageTime = messageTime;
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
            userCaps = username_convert(userCaps);
        }

        channel = channel.substring(1); // get rid of #

        let sBefore = TT.config.chatSayBefore.replace(/{channel}/ig, channel).replace(/{user}/ig, userCaps);
        let sAfter = TT.config.chatSayAfter.replace(/{channel}/ig, channel).replace(/{user}/ig, userCaps);
        // MUTATE the pack's message
        pack.message = sBefore + ' ' + pack.message + ' ' + sAfter;
    }
}

    // convert atted names and underscores so @some_nameIsCool -> some name Is Cool
    // a-z0-5 then caps split or numbers then anything split

function username_convert(name) {
    const splitOnNumbersRegex = /(\d+)(\D)/g;
    const camelCaseRegex = /([a-z0-9]+)([A-Z])/g;  // spaces between theCamelCases

    name = name.replaceAll("_", " ");

    if (TT.config.chatReadNameDigits === false) {
        name = name.replace(NAME_DIGITS_REMOVE_REGEX, " ");
    } else {
        name = name.replace(splitOnNumbersRegex, "$1 $2");
    }

    name = name.replace(camelCaseRegex, "$1 $2");

    return name;
}

    /**
     * This is simple but if you have terms that replace a term then another can turn it back
     * So either split or put in tokens/hashes
     * @param {*} text
     * @returns
     */

function regex_term_replace(text) {
    let tokens = [];
    let count = 0;
    for (let [rgx, replace] of TT.config.regexReplacers) {
        //text = text.replace(rgx, replace); // originally
        let token = "¬~" + count + "~¬";
        text = text.replace(rgx, token);
        count++;
    }
    count = 0;
    for (let [,replace] of TT.config.regexReplacers) {
        let token = "¬~" + count + "~¬"
        text = text.replaceAll(token, replace);
        count++;
    }
    return text;
}

function atted_names_convert(message) {
    const atNameRegex = /@\w+/g;    // a-zA-Z0-9_

    const rMatches = message.match(atNameRegex);

    if (rMatches !== null) {
        for (let match of rMatches) {
            // DON'T MODIFY MATCH
            let subName = match;

            subName = username_convert(subName);

            if (match !== subName) {
                message = message.replace(match, subName);
            }
        }
    }

    return message;
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
    TT.emitter.on(EVENTS.USER_IGNORED, on_user_ignored);
    TT.emitter.on(EVENTS.USER_UNIGNORED, on_user_unignored);
    TT.emitter.on(EVENTS.MESSAGE_DELETED, on_message_deleted);
    TT.emitter.on(EVENTS.MESSAGE_SKIPPED, on_message_skipped);
    TT.emitter.on(EVENTS.SPEECH_DISABLED, on_speech_disabled);
    TT.emitter.on(EVENTS.SPEECH_ENABLED, on_speech_enabled);
    TT.emitter.on(EVENTS.SPEECH_PAUSED, on_speech_paused);
    TT.emitter.on(EVENTS.SPEECH_RESUMED, on_speech_resumed);

    TT.emitter.on(EVENTS.QUERY_PARAMS_CHANGED, on_query_params_change);
    TT.emitter.on(EVENTS.QUERY_PARAMS_UNCHANGED, on_query_params_unchanged);

    /**
     * Enabled or off switch pressed
     */

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
        on_speech_resumed();
        stop_go_icon_on();
    }


    function on_speech_resumed() {
        gid("playpauseicon").dataset["icon"] = "pause";
        gid("pausespeech").checked = false;
        TT.config.chatPaused = false;

        speech.resume();
            // let it start the engine if disabled
        if (TT.config.chatEnabled === false ) on_speech_enabled();
    }

    function on_speech_paused() {
        gid("playpauseicon").dataset["icon"] = "play";
        gid("pausespeech").checked = true;
        TT.config.chatPaused = true;
        speech.pause();
    }

    function on_user_ignored(e) {
        let deleted = speech.cancel_user_messages(e.detail.userLower);
        // toast("Deleted " + deleted + " messages for that bastard");
        msgDisp.ignore_user(e.detail.userLower);   // oh no you don't!
    }

    function on_user_unignored(e) {
        msgDisp.unignore_user(e.detail.userLower);   // oh no you don't!
    }

    function on_message_deleted(e) { //console.log("deleting id", e.detail.messageid);
        msgDisp.remove_msg(e.detail.messageid);   // oh no you don't!
        speech.cancel_id(e.detail.messageid);
    }

    function on_message_skipped(e) {//        console.log("skipping id", e.detail.messageid);
        msgDisp.speech_queue_entry_to_old_messages(e.detail.messageid, "skipped", "link", "skipped"); // do before cancel
        speech.cancel_id(e.detail.messageid);
    }

    function on_query_params_change(e) {
        gid("savewarning").classList.remove("is-hidden");
    }

    function on_query_params_unchanged(e) {
        gid("savewarning").classList.add("is-hidden");
    }
}

function add_speecher_events() {
    TT.emitter.on(EVENTS.SPEECHER_CANCELLED, on_speech_cancelled);
    TT.emitter.on(EVENTS.SPEECHER_ERROR, on_speech_error);
    //TT.emitter.on(EVENTS.SPEECHER_START, on_speech_started);
    TT.emitter.on(EVENTS.SPEECHER_END, on_speech_ended);

        /**
         * Important - adds the voice to the pack and prunes the old list
         * @param {customEvent} e.detail = {messageid, utterance}
         */


    TT.emitter.on(EVENTS.SPEECHER_BEFORE_SPEAK, e => {
        if (TT.config.speechQueueOldLimit > 0)
            msgDisp.speech_queue_old_prune(TT.config.speechQueueOldLimit -1);

        let ut = e.detail.utterance;
            // !vcmd can be in the custom data or use the user's assigned one
        let autoVoiceCmd = ut.customdata.voiceCmd || TT.config.userAutoVoices[ut.customdata.userLower];
            // customdata.voicepack {p,r,v} OR voice command from above !voice OR default
        let voicePack = ut.customdata.voicepack     // test buttons add a voicepack
            || TT.config.autoVoiceMap[autoVoiceCmd] // a voice assigned to them
            || TT.config.autoVoiceMap[undefined];   // the default voice

            // I used to clamp this but fuck it.
        if (voicePack) {
            ut.rate = voicePack.rate;
            ut.pitch = voicePack.pitch;
            ut.voice = voicePack.voice;
            if (JANKED && voicePack.text?.length) ut.text = voicePack.text; // a percent chance could be used here
        }

        ut.volume = TT.config.volumemaster / 100.0;
    });


    function on_speech_ended(e) {
        msgDisp.speech_queue_entry_to_old_messages(e.detail.messageid);//, "ended", "link");
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
}

function add_twitch_moderation_events() {
    TT.emitter.on(EVENTS.TWITCH_MESSAGE_DELETED, e => {
        if (!TT.config.chatRemoveModerated) return;
        let {channel, username, deletedMessage, userstate, messageid} = e.detail;
        speech.cancel_id(messageid);
        // msgDisp.remove_msg(messageid);  // this deletes it - I'd prefer to know
        msgDisp.speech_queue_entry_to_old_messages(messageid, "modded", "warning");
    });

    TT.emitter.on(EVENTS.TWITCH_BANNED, e => {
        let {channel, username, reason, userstate} = e.detail;
        speech.cancel_user_messages(username);
        msgDisp.user_messages_to_old(username, "banned", "danger");
    });

    /* TT.emitter.on(EVENTS.TWITCH_CHAT_CLEARED, e => {
        let {channel, "room-id": roomid, "tmi-sent-ts": time} = e.detail;
    }); */
        // timeouts happen before a ban but with duration undefined
    TT.emitter.on(EVENTS.TWITCH_TIMEOUT, e => {
        if (e.detail.duration === undefined) return; // it's a ban
        let {channel, username, duration, userid, "room-id": roomid, "tmi-sent-ts": time} = e.detail;
        speech.cancel_user_messages(username);
        msgDisp.user_messages_to_old(username, "timeout", "warning");
    });
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