/**
 * Class to construct / insert / select /react to changes on a select
 *
 *  IMPROVED OVER version in Twitch-Tools
 *
 * version 0.3.0
 * Changes:
 *  add() now has a 4th parameter for the insert index make sure to select_val after
 *  Now accepts string or htmlSelectElement in the constructor
 *
 * REMEMBER: Select values are strings.  1 => "1", false => "false", null => "null"
 * <option value> equates to ""
 * <option> equates to the text of the option
 * Selecting a value that doesn't exist will make the select blank and null will be returned for the value - actual null
 */

let dce = x => document.createElement(x);

export default class Select {

    //#id = null;  // html id of the element
    #selectNode = null;

    staySelected = true;    // if the entries change keep the selected value

    sortByText = false;
    sortByValues = false;

        // any events that might be tied to the select
    events = [];

        /**
         *
         * @param {string idOrSelect, HTMLSelectNode} id
         */

    constructor(idOrSelect = null) {
        if (idOrSelect.constructor === HTMLSelectElement) {
            this.#selectNode = idOrSelect;
        }   // assume a string
        else if (typeof idOrSelect === "string") {
            let selNode = gid(idOrSelect);

            if (selNode) {
                this.#selectNode = selNode;
            } else {
                this.create_select();
                this.#selectNode.id = idOrSelect;
            }
        }
    }

        /**
         * adopts an existing select if the value passed is an id
         * creates a select otherwise and sets its id to val
         */

    set id(val) {
        this.#selectNode.id = val;
    }
/*
    set id(val) {
        let selNode = gid(val);
            // check if selNode's constructor is HTMLSelectElement or adopt what the id points to
        if (selNode) {
            if (selNode.constructor !== HTMLSelectElement) {
                console.warn(`Select class WARNING: The element with the id "${val}" is not a select element.  It is ${selNode.constructor}`)
            }
            this.#selectNode = selNode;
            this.#id = val;
            return;
        }

            // set as it may be created later
        this.#selectNode = dce("select");
        if (val) {
            this.#selectNode.id = val;
            this.#id = val;
        }
    } */

    get id() {
        return this.#selectNode.id;
    }


        // set to a selected value
    select_val(val) {
        // let opts = this.#selectNode?.options ?? gid(this.#id)?.options ?? null;
        let opts = this.#selectNode?.options ?? null;

        if (!opts) return false;

        this.#selectNode.value = val;

        if (val == this.get_val()) return true;

        return false;
    }

        // get selected value
    get_val(value = null) {
        // let select = this.#selectNode ?? gid(this.#id) ?? null;
        let select = this.#selectNode ?? null;
        let selectVal = select?.selectedIndex >= 0 ? select.options[select.selectedIndex].value : null;
        return selectVal;
    }
        // alias for get_val
    value = this.get_val;
    val = this.get_val;


    has_val(value) {
        // let select = this.#selectNode ?? gid(this.#id) ?? null;
        let select = this.#selectNode ?? null;
        if (select === null) return false;
        for (let opt of select.options) {
            if (opt.value === value)
                return true;
        }
        return false;
    }

    // get selected text
    get_text = function get_select_text() {
        // let select = this.#selectNode ?? gid(this.#id) ?? null;
        let select = this.#selectNode ?? null;
        return select?.selectedIndex >= 0 ? select.options[select.selectedIndex].text : null;
    }

    text = this.get_text;

        // CUT AND PASTE so needs changing
        // *param object key -> value
        // array of key/value pairs [ [key, value], [key,value], ...  ]
        // array of single values

        // if it already exists.... pffft
        // DEBUG creates a HTMLSelect with our id - this is crap, I want it to be able to create an anonymous one
        // NEEDS CHANGING

        /**
         * Creates a html select
         * @param {Array, Object, Map} optsData
         * @param {boolean} replaceThisSelect whether to replace our selectNode with the newly created select
         * @returns HTMLSelectElement
         */

    create_select(optsData = [], replaceThisSelect = true) {
        /* if (!this.#id.toString().length) {
            console.error("ERROR: Can't create a select with no id");
            toast("Set an id for the select first", "is-error", 8000);
            return false;
        } */

        let sel = document.createElement('select');

        let opts = this.create_option_set(optsData);

        if (opts) {
            sel.replaceChildren(...opts);
        }

        if (replaceThisSelect === true) this.#selectNode = sel;

        return sel;
    }

        /**
         *  Creates option from the passed argument
         * @param {Array, object, map} options
         * @returns HTMLOptGroupElement / false
         */

    replace_options(optsData) {
        if (!this.#selectNode) {
            toast("Can't replace options on select.  The node is empty: ", "is-danger", 8000);
            console.error("ERROR replace_options error on select. #selNode: " + this.#selectNode);
            return false;
        }
            // selected may carry over
        let currValue = this.get_val();

        let opts = this.create_option_set(optsData);

        if (opts) {
            this.#selectNode.replaceChildren(...opts);
        }

        if (this.staySelected) this.#selectNode.value = currValue;

        return opts;
    }

        /**
         *
         * @param {Array, object, map} options
         * @returns HTMLOptGroupElement or false
         */

    create_option_set(optsData = []) {

        if (Array.isArray(optsData)) {  // if single values, not pairs then create pairs
            optsData = [...optsData] ; // create a copy so we don't affect the passed array

            for (let idx = 0; idx < optsData.length; idx++) {
                if (optsData[idx] instanceof Array) {
                    if (optsData[idx].length < 2) { // array of arrays but they're singular - weird but make the value the text
                        optsData[idx] = [optsData[idx][0], optsData[idx][0]];
                    } else {
                        //console.log("It's a pair length", options[idx].length, options[idx][0], options[idx][1] );
                        let extra = optsData[idx].length > 2 ? optsData[idx][2] : {}
                        optsData[idx] = [optsData[idx][0], optsData[idx][1], extra];
                    }
                } else {    // a single value, make text and value same
                    optsData[idx] = [optsData[idx], optsData[idx]];
                }
            }
        } else if (optsData?.constructor === Object) {    // OBJECT
            optsData = Object.keys(optsData).map(k => [k, optsData[k]]);
        } else if (optsData?.constructor === Map) {       // MAP
            optsData = optsData.entries().toArray();
        } else {
            console.error("Select.create_options() passed neither an object nor array nor map", optsData);
            return false;
        }

            // sort, create, return

        let opts = [];
            // alpha sort the object's keys
        if ( this.sortByText ) {
            optsData.sort( (a,b) => a[1].toString().localeCompare(b[1].toString()) );
        } else if ( this.sortByValues ) {
            optsData.sort( (a,b) => a[0].localeCompare(b[0]) );
        }

        for (let o of optsData) { // does the option have a dataset as the 3rd parameter
            let dataset = o.length > 2 ? o[2] : {}
            let opt = this.create_option(o[0], o[1], dataset);

            opts.push(opt);
        }

        return opts;
    }


    create_option(val, text, dataset = {}) {
        let opt = dce("option");
        opt.value = val; opt.text = text;
        if (Object.keys(dataset).length) {
            Object.assign(opt.dataset, dataset);
        }

        return opt;
    }


        // adds an option.  Extras are properties that will be added to the option
        // obeys this.sortByVal or sortByText

    add(val, text, dataset = {}, insertAt = null) {
        if (val === undefined || text === undefined) {
            console.error("Select.add() given bad things., val, text")
            return false;
        }

        let opt = this.create_option(val, text, dataset);

            // null defaults to end
        let insertIndex = null;
        let opts = this.#selectNode.options;

            // if sorting find the insert point rather than sorting the entire option set

        if (insertAt !== null) {
            insertIndex = parseInt(insertAt);
        } else if (this.sortByText) {  // would this really be useful as a smaller func get_insert_index(...
            for (insertIndex = 0 ; insertIndex < opts.length ; insertIndex++) {
                if ( opts[insertIndex].text.toString().localeCompare(text) >= 0) {
                    break;
                }
            }
        } else if (this.sortByValues) {
            for (insertIndex = 0 ; insertIndex < opts.length ; insertIndex++) {
                if ( opts[insertIndex].value.toString().localeCompare(val) >= 0) {
                    break;
                }
            }
        }

        this.#selectNode.options.add(opt, insertIndex);
    }

        /**
         *
         * @param {any} value to compare
         * @param {select element, options collection, id of a select or null} options options to search through, default = use ours
         */

    disable_by_value(val, options = null) {
        options = this.options_validate(options);

        if (options === false) return;

        for(let opt of options) {
            if (opt.value === val) {
                opt.disabled = true;
            }
        }
    }

    enable_by_value(val, options = null) {
        options = this.options_validate(options);

        if (options === false) return;

        for(let opt of options) {
            if (opt.value === val) {
                opt.disabled = false;
            }
        }
    }

        // last param moonlights it to remove by text
    remove_by_value(val, limit = null, byText = false) {
        let removedCount = 0;

        let options = this.options_validate();

        if (options === false) return false;

        let selectedIndex = this.#selectNode.selectedIndex;
        let index = 0;

        for (let opt of options) {
            if (limit !== null && remove >= limit) break;

            let compare = byText === false ? opt.value : opt.text

            if (compare === val) {
                opt.remove();   // hopefully won't cause issues
                removedCount++;
                    // if an entry has been pulled under us reduce the selected index
                    // selected index goes to zero when the option is removed
                if (index < selectedIndex) selectedIndex--;
            }

            index++;
        }

            // restore the selected index
        let optsLen = this.#selectNode.options.length;
        this.#selectNode.selectedIndex = selectedIndex >= optsLen ? optsLen -1 : selectedIndex;

        return removedCount;
    }

    remove_by_text(text, limit) {
        return this.remove_by_value(text, limit, true);
    }

        /**
         *  Returns valid options for a select element, select options, a string id that is a select, or this classes select
         * @param {any} value to compare
         * @param {select element, options collection, id of a select or null} options options to search through, default = use ours
         */

    options_validate(options) {
        if (options === null || options === undefined) {
            options = this.#selectNode?.options;    // I should check
        }

        if (options?.constructor !== HTMLOptionsCollection) {
            if (options?.constructor === HTMLSelectElement ) {
                return options.options;
            } else
            if (options?.constructor === String) {
                let o = gid(options)?.options;
                if (o === undefined) {
                    return false;
                }
                return o;
            } else {
                console.error("Select.options_validate() has no valid options source");
                toast("Select.options_validate()  has no valid options source.", "is-danger", 8000);
                return false;
            }
        }

        return options;
    }

    trigger_onchange() {
        let chEv = new Event('change');
        this.#selectNode.dispatchEvent(chEv);
    }

        // gets the "HTML" for dom insertion

    get_dom_node() {
        return this.#selectNode;
    }

    on(event, fn) {
        this.#selectNode.addEventListener(event, fn);
    }

    focus() {
        this.#selectNode?.focus();
    }
}