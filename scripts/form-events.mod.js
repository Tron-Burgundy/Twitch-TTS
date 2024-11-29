/*
    Adds events and data converters for data-to on form fields triggered by onchange
*/
import EVENTS from "./event-constants.mod.js";
import { create_commands_voice_map } from "./voice-selects-setup.mod.js";
// import Select from "./classes/select.class.js";
import { url_populate } from "./form-saver.mod.js";
//import "./form-saver.mod.js";
import { hashToVoiceMap } from "./voice-selects-setup.mod.js";

import { FORM_FIELD_TO_CONVERTERS } from "./config-setters.mod.js";
import { voiceCmdSelect } from "./voice-selects-setup.mod.js";

import { VOICE_CMDS_QUERY, TEST_MESSAGE } from "./config.mod.js";
import { speech } from "./main.mod.js";

const FORM_EVENT_HANDLERS_INITIAL = [
    {selector: '[data-to]', event: 'change', function: on_form_field_change, params: {}},

    {selector: '#channels', event: 'change', function: e => TT.join_chans(e.target.value), params: {}},

    {selector: "#playpausebtn, #pausespeech", event: "click", function: on_play_pause_click, params: {}},
    {selector: "#stopgobtn, #enablespeech", event: "click", function: on_stop_go_click, params: {}},
    //		{selector: '#channels', event: 'change', function:  u rl_populate_onchange, params: {}},

//     {selector: '#loglabel', event: 'click', function: () => log('', true), params: {}},
//     {selector: '.urlpo pul ate', event: 'click', function: ns.ur l_popu late, params: {}},
//         // any change in any .form-save value updates the url
//         // it does get called like 120+ times on load, though
    //{selector: '.form-save', event: 'change', function: url_populate, params: {}},
    {selector: 'input[type="range"]', event: 'input', function: on_slider_input, params: {}},
    {selector: VOICE_CMDS_QUERY, event: 'change', function: on_voice_command_change, params: {}},

    {selector: "button[data-index]", event: 'click', function: on_test_btn_click, params: {}},

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

function on_test_btn_click(e) {
    let idx = e.target.dataset["index"];
    let rate = gid("r"+idx).value;
    let pitch = gid("p"+idx).value;
    let vHash = gid("v"+idx).value;
    let voice = hashToVoiceMap.get(vHash);

    let pack = {immediate:true, message: TEST_MESSAGE, voicepack: {rate, pitch, voice}};

    console.log("PACK TO TEST", pack);
    speech.speak(pack);
}