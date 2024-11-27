///// REVAMPED /////
///// REVAMPED /////
///// REVAMPED /////

import { create_tag_pools } from "./tag-pools.mod.js";

/*  15859 is the max url chars I've got up to in Brave, then it goes wrong
	15787 in Edge
	15802 in Chrome
*/
window._to_uri = query_string_from_inputs;
window._restore = x => {restore_form_values(); create_tag_pools(); }
window._r = restore_form_values;

window._url_populate = url_populate;

import { FORM_RESTORE_CONFIG, set_form_defaults } from "./config.mod.js";
import { FORM_IN_OUT_FILTERS } from "./form-inout-filters.mod.js";
import EVENTS from "./event-constants.mod.js";

const FORM_RESTORE_VERBOSE = false;
	// can be used to offer a "Save your settings" thing if you've changed anything


 	/**
 	*	Returns form fields as uri encode pairs separated by &
	*	Fields should have a name, and ideally should be inputs
	* @param {string} selectors e.g. "#myform input"
	* @returns
	*/

function query_string_from_inputs(selectors = '.form-save') {
	let inputs = document.querySelectorAll(selectors);
	let uri = [];

	for (let field of inputs) {
		let value;
			// use id if no name property
		const name = field.name ? field.name : field.id;

		if (!name) {
			console.error("inputs_to_uri_string : Field does not have a name or id : ", field);
			continue;
		}

		switch(field.type) {
			case 'reset': case 'submit': case 'image':
				return;
			case 'radio':
				if (!field.checked) return;	// could just skip this
				value = field.value;
				break;
			case 'checkbox':
				value = field.checked;
				break;
			default:
				value = field.value.trim();
				break;
		}

	        // does the element have an outgoing filter ? filter="myfilterL {in: fn, out: fn}"
		value = to_filtered_inout_value(value, field, "out");

		if (value === null) continue;

		 try {
			uri.push(`${encodeURIComponent(name)}=${encodeURIComponent(value)}`);
		 } catch (e) {
			console.error("ERROR encoding URI Component:", e);
		 }
	};
		// I could localstore_save() here NO - you've got one job.  url_populate does that
	return uri.join('&');
}



	/**
	 *
	 * @param {*} selector
	 * @param {object} opts values that will overwrite defaults in FORM_RESTORE_CONFIG
	 */

 //TT.restore_form_values = function restore_form_values(selector = '.form-save', opts = restore_opts_default) {
export function restore_form_values(selector = '.form-save', opts)
{
	let optsGroup = {...FORM_RESTORE_CONFIG, ...opts}

	let { paramString, localStorageFallback } = optsGroup;
	 console.log("Got Opts", optsGroup);


	if (!paramString && localStorageFallback) {
		 paramString = localstore_load();
	}

	let getVars = get_query_string_params(paramString);

	if (!paramString) {
		// load defaults
		set_form_defaults();
		return;
	}

	let inputs = document.querySelectorAll(selector);

	for (let field of inputs) {
		const name = field.name ? field.name : field.id;

		if ( !name ) {
			if (FORM_RESTORE_VERBOSE) console.error("restore_form_values : Field does not have a name : ", field);
			continue;
		}

		if ( !(name in getVars) ) {
			if (FORM_RESTORE_VERBOSE) console.warning("restore_form_values : field has no url match : ", name)
			continue;
		}

		if ( !field.type ) {
			if (FORM_RESTORE_VERBOSE) console.error("restore_form_values : field has no type : ", field)
			continue;
		}

		switch(field.type) {
			case 'reset': case 'submit': case 'image':
				return;
			case 'radio':
				if (field.value === getVars[name]) {
					field.checked = true
				} else {
					field.checked = false;
				}
				break;
			case 'checkbox':
				if (getVars[name] == "true") {
					field.checked = true;
				} else {
					field.checked = false;
				}
				break;
			default:	// works for selects
				let value = getVars[name];
					// check for filter
				field.value = to_filtered_inout_value(value, field, "in"); // they're decoded now
				break;
		}
	};
}


	/**
	 * Filters data for a form item before it is restored to it
	 * @param {*} value
	 * @param {*} field
	 * @param {*} inOrOut
	 */

function to_filtered_inout_value(value, field, inOrOut) {
	if (inOrOut !== "in" && inOrOut !== "out")
		throw "inout must be 'in' or 'out'";

	if (field.dataset["inout"]) {
		let filterName = field.dataset["inout"];
		let filterFn = FORM_IN_OUT_FILTERS[filterName]?.[inOrOut];

		 if (typeof filterFn === "function") {
			//console.debug("BEFORE FILTERING " + inOrOut, value);
			value = filterFn(value, field);
			//console.debug("AFTER FILTERING " + inOrOut, value);
		}
	}

	return value;
}

	/** Store data in localStorage called urlParams */

export function localstore_save(data) {//	TT.local_store_set('urlParams', data);
	let namePath = "urlParams" + window.location.pathname;
	localStorage.setItem(namePath, JSON.stringify(data));
}

function localstore_load() {
	let namePath = 'urlParams' + window.location.pathname;
	return JSON.parse( localStorage.getItem(namePath) );
}

	// returns object of key:value pairs from the url ?foo=bar parameters

function get_query_string_params(params = window.location.search) {
	let getVars = {};
	//decodeURI(window).replace(/[?&]+([^=&]+)=([^&]*)/gi, function(a,name,value){getVars[name]=value;});
	try {
		if (params[0] === '?') params = params.substring(1);
		params.split("&").forEach(a => {
			let [name, value] = a.split("=");
			if (value !== undefined)
				getVars[decodeURIComponent(name)] = decodeURIComponent(value);
		});
	} catch (e) {
		console.log("ERROR: quert_string_params_to_array -", e);
	}
	return getVars;
}

	/**
	 *
	 */

 export function url_populate() {
	let urlParams = query_string_from_inputs();

		// sets the value in localStorage to use in form values restore
	localstore_save(urlParams);
	let url = window.location.origin + window.location.pathname + '?' + urlParams;

	history.replaceState({}, null, url);

	if (TT.queryStringOnLoad !== window.location.search) {
        TT.emit(EVENTS.QUERY_PARAMS_CHANGED)
    }
		// fill the link box
	//let urlBox = gid('linkurl');
	//if (urlBox) urlBox.value = url;
}
