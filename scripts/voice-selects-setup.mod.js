/*
    find the selects
    find the filters
    fill em with shit

    I need the selects to have values that are hashes
    I need an object to map hashes to voices

    maps we need:

    !vcommand to whatever our syth voices are
    hash of voice uri to

*/
import Select from "./classes/select.class.js";
import EVENTS from "./event-constants.mod.js";
import { speech } from "./main.mod.js";
import { VOICE_CMDS_QUERY } from "./config.mod.js";

const hashToVoiceMap = new Map();
const hashToVoiceNameMap = new Map();
    // the select used to choose a custom voice
export const voiceCmdSelect = new Select("voicecommand");
voiceCmdSelect.sortByText = true;

window._vm = hashToVoiceMap;
window._vn = hashToVoiceNameMap;
window._vs = voiceCmdSelect;

window.addEventListener("load", voice_selects_main);

    // things just look prettier in functions rather than just dumped in the 'flow'

var initialised = false

async function voice_selects_main() {
    if (initialised) return; initialised = true;
    await speech.ready();
    console.log("Voices select got this many voices:", speech.getVoices().count);
    TT.emitter.on(EVENTS.SPEECHER_VOICES_CHANGED, populate_voice_selects);
}



    /**
     * turns commands into a {command: {SynthesisVoice, pitch, rate}}
     * Also creates a default voice with undefined as the key (ooooo, I see what you did there)
     */

export function create_commands_voice_map() {
    let vSels = qsa(VOICE_CMDS_QUERY);
    let map = {};

    // also create an entry for the first one with no key

    map[undefined] = {
        pitch: gid("p1").value,
        rate: gid("r1").value,
        voice: hashToVoiceMap.get( gid("v1").value )
    }

    for (let sel of vSels) {
        let cmd = sel.value;
        // voices have s1, v1, r1, p1
        if (cmd.length > 1) {
            let cmdIndex = sel.id.substring(1);
            // find the voice
            let voiceHash = gid("v"+cmdIndex).value;

            if (voiceHash.length === 0) continue;

            let voice = hashToVoiceMap.get(voiceHash);

            let pitch = gid("p"+cmdIndex).value;
            let rate = gid("r"+cmdIndex).value;

            map[cmd.substring(1)] = {voice, pitch, rate};
        }
    }

    TT.set_conf("autoVoiceMap", map);
}


    /**
     * Fills voice selects with the value as a hash and voice voice a sanitised version of the voice name
     * options for the select have data-lang that the voice filter select uses
     */

// let selectsInitialised = true;

export function populate_voice_selects() {
    // get the selects
    let selects = qsa(".voice-select");
    let filters = qsa(".voice-filter");

    setup_voice_hashes();

    for (let sel of selects) {
        let sObj = new Select(sel.id);
        sObj.staySelected = true;   // onVoicesChanged may spike this
        sObj.sortByText = true;

        let opts = sObj.replace_options(hashToVoiceNameMap);

        sObj.add("", "Choose Voice", {}, 0);    // insert a default.  If staySelected is true this won't matter
            // add data-lang to the options the lazy way by using the hash map
        for (let opt of opts) {
            opt.dataset["lang"] = hashToVoiceMap.get(opt.value).lang.split("-")[0];
        }
    }

    for (let sel of filters) {
        let sFilter = new Select(sel);
        sFilter.staySelected = true;   // onVoicesChanged may spike this
        sFilter.sortByText = true;
        fill_voice_filter_select(sFilter);
            // DON'T use a closure as it'll add an extra one every time
        sFilter.on("change", on_voices_filter_select_change);
        // trigger onchange to re-filter the select list
        sFilter.trigger_onchange();
    }

    // selectsInitialised = true;
}


    /**
     *
     * @param {Select class} select
     */

function fill_voice_filter_select(select) {
    let voices = speechSynthesis.getVoices();

    let langs = [], langsR = [];

    voices.map( (v, index) => {
        let [lang, region] = v.lang.split('-');
            // name MAY NOT have a dash but URL always seems to
            // format is like Microsoft Abeo Online (Natural) - English (Nigeria)
        let langW = v.voiceURI.split('- '); // = 0: ...(Natural), 1: English (Nigeria)
            // regex matches what's before the brackets and what's in them.  Now simplified
        if (langW.length > 1) {            //let c = langW[1].match(/(\w*)\s\((.*)\)/);             //langs[lang] = c[1];
            langs[lang] = langW[1].split(" (")[0]; // English (Nigeria) -> English
        }
    });
        // the object will be magically naturally sorted
    langs = Object.entries(langs);  // to [ [val, text], [val, text], ... ]
    langs.unshift(["", "All Voices", {"all": true}]);

    select.replace_options(langs);
}

    /**
     *  Hides options in the select targeted by its data-for based on their data-lang
     * @param {change Event} e
     */

function on_voices_filter_select_change(e) {
    let v = e.target.value;
    let target = gid(e.target.dataset["for"]);
    let opts = target.options;

    for (let opt of opts) {
        if (v === "" || opt.dataset["lang"] === v)
            opt.classList.remove("is-hidden");
        else
            opt.classList.add("is-hidden");
    }
}


    /**
     * converts voiceURIs to 8 character hashes for url vars
     * creates hashToVoiceMap of synthesis voices
     * creates hashToVoiceNameMap for prettified voice names
     */

function setup_voice_hashes() {
    hashToVoiceMap.clear()

    for (let k in s.voiceMap) {
        let hash = quick_hash(s.voiceMap[k].voiceURI);
        hashToVoiceMap.set(hash, s.voiceMap[k]);
        hashToVoiceNameMap.set( hash, cleanup_voice_name(s.voiceMap[k].name) );
    }
}



    /**
     * Removes junk from voice names so they fit in the selects better
     * @param {string} name
     * @returns string prettified name
     */

function cleanup_voice_name(name) {
    let replacer = /(Microsoft\w*|Online \(Natural\)| Traditional)\w*/g;
    let replaceNMD = /Republic of North Macedonia/g;
    let replaceMan = /\(.*Mandarin.*\)/;
    let replaceMulti = /Multilingual/;
    let replaceUAE = /United Arab Emirates/;

    return name
        .replace(replacer, "")
        .replace(replaceNMD, "NMD")
        .replace(replaceUAE, "UAE")
        .replace(replaceMulti, " Multi")
        .replace(replaceMan, "(Mandarin)")
}


    // voice in box 1
function get_default_voice() {

}
    // !pb to voice
function get_voice_for_command(command) {

}

    /**
     * Turns a string into an 8 character hash.  Used for shortening voices used in the url
     * @param {string} str
     * @returns string
     */

function quick_hash(str) {
    return  str.split('').map(v=>v.charCodeAt(0)).reduce((a,v)=>a+((a<<7)+(a<<3))^v).toString(16);
}
