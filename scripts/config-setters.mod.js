import { parse_key_value_string, split_to_array } from "./form-inout-filters.mod.js";
import { parse_term_replace_string } from "./replace-terms.mod.js";

    /**
     * Convert 'strings' from url data into the appropriate type in data-to
     * e.g. converts to array/objects/ints etc.  Clamping values on the inputs can be used
     */

export const FORM_FIELD_TO_CONVERTERS = {
    "array": set_conf_array,
    "arraylc": set_conf_array_lc,
    "int": set_conf_int,
    "float": set_conf_float,
    "str": set_conf_string,
    "strlc": set_conf_string_lc,
    "checkbox": set_conf_checkbox,
    "keyvaluepairs": set_conf_key_value_pairs,
    "replacers": set_conf_replacers,
}


	/**
	 *	Set a property in an object - deep allowed like 'foo.bar.doo'
	 * @param {string} path of property e.g. "someprop" or "some.deeper.prop"
	 * @param {*} val
	 */

TT.set_conf = function set_conf(path, val, target = TT.config) {
    let sp = path.split('.')
    let finalPropName = sp.pop();

    if (target === undefined) target = {};

    let ref = sp.reduce( (obj, prop) => {
        if (obj[prop] === undefined) {
            obj[prop] = {}
        }
        return obj[prop]
    }, target)

    ref[finalPropName] = val;
}

        /**
         * Returns the value of an object based on a string of its properties e.g. get_conf("my.deep.property", object)
         * @param {string} path as property.within.object based on the target
         * @param {*} target object to get the property of
         */

TT.get_conf = function get_conf(path, target = TT.config) {
    let propsPath = path.split('.');
    let value = target;
        // let this throw an error
    for (let prop of propsPath) {
        target = target[prop];
    }

    return target;
}


    // maps to a bool

function set_conf_checkbox(e) {//	verify_data_varname(e);
    return TT.set_conf(e.target.dataset.to, e.target.checked)
}

        // maps to int checking max and min

function set_conf_int(e) {	//verify_data_varname(e);
    let valOrig = e.target.value;	// will be string

    let i = parseInt(e.target.value);

    if ( isNaN(i) ) {
        i = parseInt(e.target.defaultValue);
    }

    if (e.target.max) {
        let m = parseInt(e.target.max);
        if (i > m) i = m;
    }
    if (e.target.min) {
        let m = parseInt(e.target.min);
        if (i < m) i = m;
    }
        // update original if it's a wrongun
    if (i.toString() !== valOrig) e.target.value = i.toString();
        // set the var
    return TT.set_conf(e.target.dataset.to, i);
}

        // maps to int checking max and min

function set_conf_float(e) {	//verify_data_varname(e);
    let valOrig = e.target.value;
    let i = parseFloat(valOrig);

    if ( isNaN(i) ) {
        i = parseFloat(e.target.defaultValue);
    }

    if (e.target.max) {
        let m = parseFloat(e.target.max);
        if (i > m) i = m;
    }

    if (e.target.min) {
        let m = parseFloat(e.target.min);
        if (i < m) i = m;
    }

    if (i.toString() !== valOrig) e.target.value = i.toString();

    return TT.set_conf(e.target.dataset.to, i);
}


function set_conf_string_lc(e) {	//verify_data_varname(e);
    e.target.value = e.target.value.trim().toLowerCase();
    return TT.set_conf(e.target.dataset.to, e.target.value)
}

function set_conf_string(e) {
    e.target.value = e.target.value.trim();
    return TT.set_conf(e.target.dataset.to, e.target.value)
}

function set_conf_array_lc(e) {
    let v = e.target.value.toLowerCase();
    let v2a = split_to_array(v);
    TT.set_conf(e.target.dataset.to, v2a);
}

function set_conf_array(e) {	//verify_data_varname(event);
    let v2a = split_to_array(e.target.value);		// allows you to use props.multi.deep
    TT.set_conf(e.target.dataset.to, v2a);
    return v2a;
}


        // I'd like this to be able to access the data it's been saving to so like
function set_conf_key_value_pairs(e) {
    let parsed = parse_equal_pairs_from_string_lower_case_keys_DATA_TO_VERSION(e.target.value, e);
    TT.set_conf(e.target.dataset.to, parsed);
}
    // eat my fn naming
function parse_equal_pairs_from_string_lower_case_keys_DATA_TO_VERSION(pString, event) {
    let obj = parse_key_value_string(pString);

    return lower_case_object_props(obj);
}

    // converts the~key(the~value**the~options)

function set_conf_replacers(e) {
    let parsed = parse_term_replace_string(e.target.value);
        // really I need to create regexes
    TT.set_conf(e.target.dataset.to, parsed);
    // to values will be split into arrays if they're split with |
    TT.config.regexReplacers = regex_from_replacers(parsed);
}

    /**
     *  Copies an object turning all of it's base level properties to lower case
     * @param {Object} obj object whose keys to turn to lower case.  It creates a copy
     * @returns Object
     */

function lower_case_object_props(obj) {
    // fills a new object with lower case keys and values from the original object
    let reduceFunc = (objCopy, k) => { objCopy[k.toLowerCase()] = obj[k]; return objCopy; }
    return Object.keys(obj).reduce( reduceFunc, {});    // starts with empty object
}


    /**
     * Converts strings of replacers into actual regular expressions
     * Used in set_conf_replacers()
     * @param {Array[object {term, to, replace},]} repArr
     * @returns array of [regex, string to replace]
     */

function regex_from_replacers(repArr) {
    let res = [];
    // characters will need to be escaped
    let regStr;

    for (let set of repArr) {
        let term = set.term;
        let pos = set.options[0];
        let rgxString = "";
        let wholeWord = set.options.includes("W");

        if (pos !== "R") term = regex_escape(term);

        switch (pos) {
            case "G":   // anywhere
                if (wholeWord)
                    rgxString = `\\b\\S*${term}\\S*\\b`;
                else
                    rgxString = term;
                break;

            case "A":   // alone
                rgxString = `\\b${term}\\b`;

            case "S":   // start
                if (wholeWord)
                    rgxString = `\\b${term}\\S*`;
                else
                    rgxString = `\\b${term}`
                break;

            case "E":   // end
                if (wholeWord)
                    rgxString = `\\S*${term}\\b`;
                else
                    rgxString = `${term}\\b`;
                break;

            case "R":   // an actual regex
                rgxString = term;
                break;

            default:
                console.error("ERROR: Unknown regex position:", pos);
                continue;
        }

        let rgx;
        try {
            rgx = new RegExp(rgxString, "ig");
        } catch (error) {
            toast("The replace expression is invalid: " + term);
            console.error(error);
            continue;
        }

//console.log("REGEX:", rgx);
            // to will either be arrays or strings
        let toArrOrStr = set.to.split("|").filter(x => x);
        if (toArrOrStr.length < 2) toArrOrStr = set.to;

        res.push([rgx, toArrOrStr]);

        /*
            If I want to add more complex regex like (a|b|c) then I'll have to abandon the encoding scheme for this
            field which isn't actually that bad.
        */

        //term = term.replace(/\\/g, "\\\\"); // backslash to real backslash
        //term = term.replace(/\./g, "\\.");  // dot to real dot

        //term = term.replace(/\*/g, ".*");           // dot wildcard
        //term = term.replace(/!/g, "\\s*");          // ! optional spaces
        //term = term.replace(/\^/g, ".{0,10}");      // ^ wildcard limited to 10 chars

        //term = term.replace(/[(]s[)]/g, "(|s|'s)"); // (s) optional s, 's

        // @&%
            // non-space characters
        //term = term.replace(/\?/g, "\\S*");         // optional "solid" non-space chars
        //term = term.replace(/\+/g, "\\S+");         // 1 or more non optional solid chars
    }

    return res;
}

function regex_escape(text) {
   return text.replace(/[-[\]{}()*+?.,\\^$|]/g, "\\$&");
}