import { parse_key_value_string, split_to_array } from "./form-inout-filters.mod.js";

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
        "keyvaluepairs": set_key_value_pairs,
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
            if (i > m) {
                i = m;
            }
        }
        if (e.target.min) {
            let m = parseInt(e.target.min);
            if (i < m) {console.log("to int less min");
                i = m;
            }
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
            if (i > m) {
                i = m;
            }
        }

        if (e.target.min) {
            let m = parseFloat(e.target.min);
            if (i < m) {
                i = m;
            }
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
    function set_key_value_pairs(e) {
        let parsed = parse_equal_pairs_from_string_lower_case_keys_DATA_TO_VERSION(e.target.value, e);
        TT.set_conf(e.target.dataset.to, parsed);
    }
        // eat my fn naming
    function parse_equal_pairs_from_string_lower_case_keys_DATA_TO_VERSION(pString, event) {
        let obj = parse_key_value_string(pString);

        return lower_case_object_props(obj);
    }


    const lower_case_object_props = (obj) =>
        Object.keys(obj).reduce((acc, k) => {
          acc[k.toLowerCase()] = obj[k];
          return acc;
    }, {});