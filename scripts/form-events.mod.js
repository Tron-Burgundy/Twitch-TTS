/*
    Adds events and data converters for data-to on form fields triggered by onchange
*/
// import Select from "./classes/select.class.js";
//import "./form-saver.mod.js";
import EVENTS from "./event-constants.mod.js";
import { VOICE_CMDS_QUERY, TEST_MESSAGE } from "./config.mod.js";
import { FORM_FIELD_TO_CONVERTERS } from "./config-setters.mod.js";
import { query_string_from_inputs, url_populate, restore_form_values } from "./form-saver.mod.js";
import { speech } from "./main.mod.js";
import { create_tag_pools } from "./tag-pools.mod.js";
import { hashToVoiceMap, voiceCmdSelect, create_commands_voice_map } from "./voice-selects-setup.mod.js";



const FORM_EVENT_HANDLERS_INITIAL = [
    {selector: '[data-to]', event: 'change', function: on_form_field_change, params: {}},

    {selector: '#channels', event: 'change', function: e => TT.join_chans(e.target.value), params: {}},

    {selector: "#playpausebtn, #pausespeech", event: "click", function: on_play_pause_click, params: {}},
    {selector: "#stopgobtn, #enablespeech", event: "click", function: on_stop_go_click, params: {}},
//     {selector: '#loglabel', event: 'click', function: () => log('', true), params: {}},
//         // any change in any .form-save value updates the url
//         // it does get called like 120+ times on load, though
    //{selector: '.form-save', event: 'change', function: url_populate, params: {}},
    {selector: 'input[type="range"]', event: 'input', function: on_slider_input, params: {}},
    {selector: VOICE_CMDS_QUERY, event: 'change', function: on_voice_command_change, params: {}},

    {selector: "#stripchars", event: 'change', function: on_filter_chars_change, params: {}},

    {selector: "button[data-index]", event: 'click', function: on_voice_test_btn_click, params: {}},

    {selector: ".savecookie", event: "click", function: save_params_cookie, params: {}},
    //{selector: ".loadcookie", event: "click", function: load_params_cookie, params: {}},
];

export const FORM_EVENT_HANDLERS_POST = [
    {selector: '.form-save', event: 'change', function: url_populate, params: {}},
    // rebuild voice map
    {selector: '#voicepanels input, .voice-select', event: 'change', function: create_commands_voice_map, params: {}},
];



function on_play_pause_click(e) {
    let emit = TT.config.chatPaused ? EVENTS.SPEECH_RESUMED : EVENTS.SPEECH_PAUSED;
    TT.emit(emit);
}

function on_stop_go_click(e) {
    let emit = TT.config.chatEnabled ? EVENTS.SPEECH_DISABLED : EVENTS.SPEECH_ENABLED;
    TT.emit(emit);
}

function on_voice_command_change(e) {
    let inVal = e.target.value
    let out = "!" + inVal.replace(/\W/g, " ").trim().replace(/ /g, "_").toLowerCase();
    e.target.value = out;

        // repopulate the voice command select

    let sels = qsa(VOICE_CMDS_QUERY);
    let cmds = [];
    for (let sel of sels) {
        let val = sel.value;
        if (val !== "!") cmds.push([val.substring(1), val]);
    }
    voiceCmdSelect.replace_options(cmds);
    voiceCmdSelect.add("", "Use voice", {}, 0);
    voiceCmdSelect.select_val("");
}


function on_filter_chars_change(e) {
    let chars = e.target.value;
    // make sure no spaces
    chars = chars.replace(/\s/g, '');
    chars = chars.replace(/[\\\[\]\-^]/g, '\\$&');

    TT.config.chatFilterChars = chars;
    TT.charFilterRegex = new RegExp("["+chars+"]", "g");
}



    /**
     * runs the data-to value conversion when a form field is changed
     * @param {event} e form field onchange event
     * @returns
     */

function on_form_field_change(e) {
    let dType = e.target.dataset["type"];

    let handler = FORM_FIELD_TO_CONVERTERS[dType];

    if (handler) {
        return handler(e);
    }
}

    /**
     * Assigns change/input events and handlers to fields that match selectors
     * @param {object array} events
     */
export function add_form_element_listeners (events = FORM_EVENT_HANDLERS_INITIAL) {
    let chEv = new Event('change');
    let inpEv = new Event('input');
                                                            console.log("EVENTS GIVEN", events);
    for (const ev of events) {
        let fs = qsa(ev.selector);
        for (const f of fs) {
            f.addEventListener(ev.event, ev.function);
             // GONE - automatic change and input triggers
        }
    }
}

    // changes the for to the value

function on_slider_input(e) {
    gid(e.target.dataset.for).innerText = e.target.value;
}

    /**
     * Voice test button handler
     * @param {Click Event} e
     */

function on_voice_test_btn_click(e) {
    let idx = e.target.dataset["index"];
    let rate = gid("r"+idx).value;
    let pitch = gid("p"+idx).value;
    let vHash = gid("v"+idx).value;
    let voice = hashToVoiceMap.get(vHash);

    let pack = {immediate:true, message: TEST_MESSAGE, voicepack: {rate, pitch, voice}};

    speech.speak(pack);
}



TT.button_add_confirmed_func(".savecookieConf", save_params_cookie, 3, "Confirm Save");
TT.button_add_confirmed_func(".loadcookieConf", load_params_cookie, 3, "Confirm Load");

function save_params_cookie(e) {
    console.log("EEE", e);
    e.stopPropagation();
    setCookie("URLPARAMS", query_string_from_inputs());
    toast("Saved settings to a cookie", "is-link");
}

function load_params_cookie() {
    let paramString = getCookie("URLPARAMS");
    restore_form_values('.form-save', {paramString});
    TT.allchange(); // man alive this is going to lag
    create_tag_pools();
    toast("Loaded settings from a cookie", "is-link");
}




    // great to see the most found get and set cookie funcs on the net are bad
const repIt = "¼Æþ";
function setCookie(cName, cValue, expDays = 1000) {
    let date = new Date();
    date.setTime(date.getTime() + (expDays * 86400 * 1000));
    const expires = "expires=" + date.toUTCString();
    // document.cookie = encodeURIComponent(cName) + "=" + encodeURIComponent(cValue) + "; " + expires + "; path=/";
    document.cookie = cName.replace("; ", repIt) + "=" + cValue.replace("; ", repIt) + "; " + expires + "; path=/";
}

    // returns undefined if not found

function getCookie(cName) {
    const cArr = document.cookie.split('; ');

    cName = cName.replace("; ", repIt);
    for (let val of cArr) {
        let [n, v] = val.split("=", 1);
        v = val.substring(n.length + 1);

        if (n === cName) {
            //return decodeURIComponent(v);
            return v.replace(repIt, "; ");
        }
    }

    return;
}

window._sc = setCookie;
window._gc = getCookie;