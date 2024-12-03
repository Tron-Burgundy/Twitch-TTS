const KVP_SPACE_SUB = "~"
import { SPACE_REPLACE } from "./config.mod.js";

/*
    data-to may need input values converting before they're usable
    e.g. key value parts as a string look lie key(value~string~with~spaces)key2(another~value)
    which will get converted to an object.
    Why not use a full url encode of the value or even JSON?  I want the url more readable and shorter
    so I've choosen characters that don't url encode.

    DATA Coming in from the url
    in: converts it

    returning null will skip the value from the url params
 */

export const FORM_IN_OUT_FILTERS = { // apply to keys or elements?
    tolower: {
        in: x => x.trim().toLowerCase() ,
        out: x => x.trim().toLowerCase()},// not necessary as it'll be done anyway

    string: {
        in: x => x.trim(),
        out: x => x.trim()},

    spaced: {
        in: form_filter_restore_spaces, // channels needs this
        out: form_filter_convert_spaces},
        // turns
    mypairsthing: { // not needed, they're for hidden fields.  One will be used for data-to
        // in: parse_key_value_string
    },

    pitchNrate: {
        out: e => e === "1" ? null : e
    },
        // sometimes this processes values before the "!" has been added
    vcmd: { // turn "I'm bAdly done" -> i_m_badly_done and if it's empty then return null
        out: x => {//console.log("vmd out has", x);
            x = x
                // .replace(/^!./, "")
                .replace(/\W+/g, " ")
                .trim()
                .replace(" ", "_")
                .toLowerCase();
            return x.length ? x : null}
    },

    vselect: {
        out: x => x.length ? x : null
    },


}

    // spaces become ~ because I prefer that to %20

export function form_filter_convert_spaces(str) {
	str = str.match(/\w+/g);
	return str ? str.join(SPACE_REPLACE) : '';
}

export function form_filter_restore_spaces(str) {
	// str = str.match(/\w+/g);
	str = str.split(SPACE_REPLACE);
	return str ? str.join(' ') : '';
}


    /**
     * Turns string of key(value~thing)key2(value~two) to an object
     * @param {*} pString
     * @param {*} target originally I planned on this being able to grab data from the underlying variable data-to saves to.  Leaving in case that is needed.
     * @returns
     */

export function parse_key_value_string(pString, target) {
    let obj = {};
    let splits1 = pString.split(")") ;

    for(let p of splits1) {
        let [prop, val] = p.split("(");
        if (val) obj[prop] = val.replaceAll(KVP_SPACE_SUB, " ");
    }

    return obj;
}

    /**
     * Rather than use the value of the form field I want this to grab the data directly from the data-to
     * @param {*} valObj object to turn into a string
     * @param {*} target not necessary for now
     * @returns
     */

export function to_key_value_string(valObj, target) {
    let tp = valObj;    // will I fuck it up
    let set =[];

    let repRgx = new RegExp(`(\\(|\\)|\\${KVP_SPACE_SUB})`, "g");

    for(let prop in tp) {
        let s = prop + "(" + tp[prop].replace(repRgx, " ").split(" ").filter(x=>x).join(KVP_SPACE_SUB) + ")";
        set.push(s);
    }

    return set.join("");
}

    // string to array of 'usual' characters may need .!@?$ added

export function split_to_array(str) {
    return str.split(/[^a-zA-Z0-9-_$£.]/).filter(e => e);
}
