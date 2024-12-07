/**
 *
 *
 *  replace format {term: string, to: string, options: string}
 *
 *
 * for replace alone I'd convert spaces to \s
 * none whole words //
 *
 */
import EVENTS from "./event-constants.mod.js";
import { SPACE_REPLACE } from "./config.mod.js";
import { trigger_onchange } from "./tag-pools.mod.js";
import { create_tag_pools } from "./tag-pools.mod.js";

const OPTION_SPLIT = "--";    // !~.()_*'-
let replacersInitialised = false;

export const REPLACE_EVENTS = [
    {selector: "#replacetermbtn", event: 'click', function: replace_term_submit_handler, params: {}},
];


window.addEventListener("load", e => {
    if (replacersInitialised) return;
    replacersInitialised = true;

    gid("replaceterm").addEventListener("keyup", x => {
        if (x.key === "Enter") {
            replace_term_submit_handler();
        }
    });
    gid("replacewith").addEventListener("keyup", x => {
        if (x.key === "Enter") {
            replace_term_submit_handler();
        }
    });

    TT.emitter.on(EVENTS.REPLACE_ADDED, e => {
        add_to_replace_shadow_field(e.detail, "replace");
        create_tag_pools();
    });
});

    /**
     * processes the form, emits if it's good
     * Does not need to dress up the submit
     */

function replace_term_submit_handler() {
    let term = gid("replaceterm").value.trim();
    if (!term.length) return;

    let to = gid("replacewith").value;
    let options = document.getElementsByName("pos");

    for (let r of options) {
        if (r.checked) {
            options = r.value;
            break;
        }
    }
    let wholeWord = gid("wholeword").checked ? "W" : "";
    options += wholeWord;

    let termset = {term, to, options};

    TT.emit(EVENTS.REPLACE_ADDED, termset);
}

    /**
     * When a term is added / deleted the shadow FIELD gets updated
     *
     * a tag pool is created from the shadow field
     */



   /**
     *  Parses a term replace string into an object.  Will need further processing to regex terms
     * Transform Search~term(replace~term--options~that~are~here) this
     * @param {string} pString
     * @param {*} target
     * @returns object
     */

export function parse_term_replace_string(pString, target) {
    let arr = [];
    let splits1 = pString.split(")") ;

    for(let p of splits1) {
        if (!p.length) continue;

        let [term, valNOptions] = p.split("(");

        let [to, options] = valNOptions.split(OPTION_SPLIT);

        to = to.replaceAll(SPACE_REPLACE, " ");
        term = term.replaceAll(SPACE_REPLACE, " ");

        if (term) arr.push( {term, to, options} );
    }

    return arr;
}

    /**
     *  Turns the passed object into a term replace string for form fields
     * @param {Array} terms {term: {value, options}
     */

function to_term_replace_string(terms) {
    let set = [];
    let rgxStr = `(\\(|\\)|${SPACE_REPLACE}|${OPTION_SPLIT})`;
    //console.log("REGEX STRING:", rgxStr);
    let repRgx = new RegExp(rgxStr, "g");

    for (let termSet of terms) {

        let termF = termSet.term.replace(repRgx, " ").split(" ").filter(x=>x).join(SPACE_REPLACE).trim();
        if (!termF.length) continue;
            // value can be nothing
        let valueF = termSet.to.replace(repRgx, " ").split(" ").filter(x=>x).join(SPACE_REPLACE).trim();
        let options = termSet.options;

        let s = termF + "(" + valueF + OPTION_SPLIT + options + ")";

        set.push(s);
    }

    return set.join("");
}

export function replace_term_populate(term) {
    for (let t of TT.config.replaceTerms) {
        if (t.term === term) {
            gid("replaceterm").value = t.term;
            gid("replacewith").value = t.to;
            gid("wholeword").checked = t.options.includes("W");
            let pos = t.options[0];
            for (let p of document.getElementsByName("pos")) {
                if (p.value === pos) {p.checked = true; break;}
            }

            break;
        }
    }
}

    /*
        In filter for replace needs to parse key value options which is face it
        one, two, three, separator

    */

window._parsereplacer = parse_term_replace_string;
window._toreplacer = to_term_replace_string;


function add_to_replace_shadow_field(termSet, targetId) {
    let field = gid(targetId);
    let term = termSet.term;

    let termTest = termSet.term.toLowerCase();//.replace();

    let currTerms = parse_term_replace_string(field.value);
        // remove the same term
    currTerms = currTerms.filter(x => x.term.toLowerCase() !== termTest);

    // it doesn't matter if to is empty
    let to = termSet.to.replace(OPTION_SPLIT, " ").trim();
    let options = termSet.options;

    currTerms.push({term, to, options})

    field.value = to_term_replace_string(currTerms);
    trigger_onchange(field);
    create_tag_pools(); // terms pool
}
