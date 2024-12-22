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
    {selector: VOICE_CMDS_QUERY, event: 'change', function: on_voice_command_change, params: {}},
    {selector: '[data-to]', event: 'change', function: on_form_field_change, params: {}},

    {selector: '#channels', event: 'change', function: e => TT.join_chans(e.target.value), params: {}},

    {selector: "#playpausebtn, #pausespeech", event: "click", function: on_play_pause_click, params: {}},
    {selector: "#stopgobtn, #enablespeech", event: "click", function: on_stop_go_click, params: {}},

    {selector: 'input[type="range"]', event: 'input', function: on_slider_input, params: {}},
    {selector: "#stripchars", event: 'change', function: on_filter_chars_change, params: {}},
        // voice test buttons
    {selector: "button[data-index]", event: 'click', function: on_voice_test_btn_click, params: {}},
    {selector: ".voice-select", event: 'change', function: on_voice_test_btn_click, params: {}},
        // save button in the save warning modal
    {selector: ".savecookie", event: "click", function: save_params_cookie, params: {}},
        // tabs will clear the tag deletes
    {selector: "[data-target='#ttstabs'] ul", event: "click", function: uncheck_tag_delete_boxes, params: {}},
    //     {selector: '#loglabel', event: 'click', function: () => log('', true), params: {}},
];

TT.button_add_confirmed_func(".savecookieConf", save_params_cookie, 3, "Confirm Save");
TT.button_add_confirmed_func(".loadcookieConf", load_params_cookie, 3, "Confirm Load");

    // handlers to add after restoring form values and allChange has been called

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
    let vCmdIn = e.target.value;
    let vCmdOut = "!" + vCmdIn.replace(/\W/g, " ").trim().replace(/ /g, "_").toLowerCase();// spaces to _
    e.target.value = vCmdOut;

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
     * Voice test button handler and for voice select on change.  isTrusted is false for allchange events
     * @param {Click Event} e
     */

function on_voice_test_btn_click(e) {
    //console.log("V TEST EVENT", e, e.target);
    if (!e.isTrusted) return;   // don't do it with the allchange event
    let idx = e.target.dataset["index"];
    let rate = gid("r"+idx).value;
    let pitch = gid("p"+idx).value;
    let vHash = gid("v"+idx).value;
    let voice = hashToVoiceMap.get(vHash);

    let pack = {immediate:true, message: TEST_MESSAGE, voicepack: {rate, pitch, voice}};
        // all data in the pack becomes utterance customdata
    speech.speak(pack);
}


    // unsets the cleckboxes for all - delete buttons - set on top nav buttons click

function uncheck_tag_delete_boxes() {
    let buttons = qsa(".hide-button-toggle");
    let change = new Event("change");

    for (let btn of buttons) {
        btn.checked = false;
        btn.dispatchEvent(change);
    }
}



function save_params_cookie(e) {
    e.stopPropagation();
    // setCookie("URLPARAMS", query_string_from_inputs());
    set_cookie_chunked("URLPARAMS", query_string_from_inputs());
    toast("Saved settings cookie", "is-link");
}

function load_params_cookie() {
    // let paramString = getCookie("URLPARAMS");
    let paramString = get_cookie_chunked("URLPARAMS");
        // the problem here is that all values not stored in the params will stay at their current values
        // could set all the defaults first - it's sorted, all fields go to defaultValue or ""
    restore_form_values('.form-save', {paramString});
    TT.allchange(); // man alive this is going to lag - not any more it ain't
    create_tag_pools();
    toast("Loaded cookie settings", "is-link");
}




    // great to see the most found get and set cookie funcs on the net are bad
    // I did a url encode of name and value, now let's cheapen that with a replace
    // going with the string replace so there's extra storage in the cookie
    // the set cookie limit of 4097 includes the cookie name and = sign

const repColonSpace = "¼Æþ";    // replaces "; " in names and values

function setCookie(cName, cValue, expDays = 1000) {
    let date = new Date();
    date.setTime(date.getTime() + (expDays * 86400 * 1000));
    const expires = "expires=" + date.toUTCString();
    //document.cookie = encodeURIComponent(cName) + "=" + encodeURIComponent(cValue) + "; " + expires + "; path=/";
    let cookie = cName.replaceAll("; ", repColonSpace) + "=" + cValue.replaceAll("; ", repColonSpace);
    // cclog("Cookie length: " + cName + " " + cookie.length, "y");
    document.cookie = cookie + "; " + expires + "; path=/";
}

    // returns undefined if not found

function getCookie(cName) {
    cName = cName.replace("; ", repColonSpace);
    //cName = encodeURIComponent(cName);
    const eqPairs = document.cookie.split("; ");

    for (let val of eqPairs) {        //let n = val.split("=", 1)[0];
        let [n,] = val.split("=");

        if (n === cName) {            //return decodeURIComponent(v);
            return val.substring(n.length + 1).replaceAll(repColonSpace, "; ");
            //return v.join("=").replaceAll(repColonSpace, "; "); // either or
        }
    }

    return;
}

    /**
     * Need a longer than 4k cookie?  Chunk it up and add numbers to the name
     * scheme have cookie name + NumChunks
     * 20 x 4097 cookies are permitted
     * @param {*} name
     * @param {*} value
     */

const COOKIE_CHUNKER_LENGTH = 4000; // give leeway of 4097 limit to allow for the name length
const COOKIE_CHUNK_COUNT_SUFFIX = "NumChunks";
const COOKIE_CHUNK_NUM_SUFFIX = "_CCHUNK_#";

window._scChunk = set_cookie_chunked;
window._gcChunk = get_cookie_chunked;
window._ccClear = clear_cookie_chunked;;

function set_cookie_chunked(name, value, expDays = 2000) {
    // find out of other values exist first
    let existingCount = getCookie(name + COOKIE_CHUNK_COUNT_SUFFIX);
    if (existingCount) clear_cookie_chunked(name);
        //
    let totChunks = 1 + Math.floor( value.length / COOKIE_CHUNKER_LENGTH );
        // could just set normal but do it chunked

    setCookie(name + COOKIE_CHUNK_COUNT_SUFFIX, `${totChunks}`);

    let chunk = 0;
    while (chunk < totChunks) {
        let start = chunk * COOKIE_CHUNKER_LENGTH;
        let end = start + COOKIE_CHUNKER_LENGTH;
        setCookie(name + COOKIE_CHUNK_NUM_SUFFIX + chunk, value.substring(start, end));
        chunk++;
    }
}

function get_cookie_chunked(name) {
    let res = "";

    let chunkCount = parseInt( getCookie(name + COOKIE_CHUNK_COUNT_SUFFIX) );
    let chunk = 0;

    while (chunk < chunkCount) {
        res += getCookie(name + COOKIE_CHUNK_NUM_SUFFIX + chunk);
        chunk++;
    }

    return res;
}

function clear_cookie_chunked(name) {
    // if ( !cookie_chunked_exists(name) ) return;
    let cName = name + COOKIE_CHUNK_COUNT_SUFFIX;
    let chunkCount = parseInt( getCookie(cName) );
    let chunk = 0;

    setCookie(cName, "", -100);

    while (chunk < chunkCount) {
        setCookie(name + COOKIE_CHUNK_NUM_SUFFIX + chunk, "", -100);
        chunk++;
    }
}

function cookie_chunked_exists(name) {
    let existingCount = getCookie(name + COOKIE_CHUNK_COUNT_SUFFIX);
    return parseInt(existingCount) ? true: false;
}

window._sc = setCookie;
window._gc = getCookie;


/*  Benchmarks - minimal for real usage so URI encode as long as the 20% extra space isn't an issue
100,000 loops of set cookie: 5911.099999964237 <--- encode uri
100,000 loops of set cookie: 5731.400000035763 <--- str replace method

100,000 loops of Get cookie: 1658.7000000476837 <--- encode url
100,000 loops of Get cookie: 222.0999999642372  <--- replace
*/