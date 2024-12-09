/* tags have user-lower and user-caps

Nickname / autvoices have an associated hidden form field
TheUserName(The~Nick~Name)OtherUser(Nikky)

We want to preserve the case for this when saving even though the keys are lower case (caused by onchange)

EMIT userignored and userunignored where necessary
*/

import EVENTS from "./event-constants.mod.js";
import { parse_key_value_string, to_key_value_string, split_to_array } from "./form-inout-filters.mod.js";
import { SPACE_REPLACE } from "./config.mod.js";
import { voiceCmdSelect } from "./voice-selects-setup.mod.js";
import { parse_term_replace_string, to_term_replace_string, replace_term_populate } from "./replace-terms.mod.js";

cclog("HEYYYYYYYYYYYYYYYY Tag Pools.mod LOADED", "m");

var initialised = false;

    //// MAIN ////
    //// MAIN ////

export function init_tag_pools() {
    if (initialised) return;
    initialised = true;

    cclog("TAG POOLS INIT please be LOADED only ONCE", "m");
        // delete labels and checkboxes in the tag pools
    delete_checkboxes_init(); // should this go to the master?  Your faith against the master's

        ///// ADD HANDLERS /////
    TT.emitter.on(EVENTS.USER_IGNORED, e => { //       console.log("IGNORED in pools", e);
        delete_from_shadow_field(e.detail.userLower, "allownamed", false);
        create_tag_pools();
    });

    TT.emitter.on(EVENTS.USER_UNALLOWED, e => {//       console.log("unallowed in pools", e);
        delete_from_shadow_field(e.detail.userLower, "allownamed", false);
        create_tag_pools();
    });

    TT.emitter.on(EVENTS.USER_UNIGNORED, e => { //       console.log("UNIGNORED in POOLS", e);
        delete_from_shadow_field(e.detail.userLower, "ignoredusers", false);
        create_tag_pools();
    });

    TT.emitter.on(EVENTS.NICKNAME_ADDED, e => { //       console.log("nicknamedeleted in POOLS", e);
        add_to_complex_shadow_field(e.detail.userCaps, e.detail.nickname, "nicknames");
        create_tag_pools();
    });

    TT.emitter.on(EVENTS.NICKNAME_DELETED, e => { //       console.log("nicknamedeleted in POOLS", e);
        delete_from_shadow_field(e.detail.userLower, "nicknames", true);
        create_tag_pools();
    });

    TT.emitter.on(EVENTS.AUTOVOICE_ADDED, e => {//        console.log("autovoicedeleted in POOLS", e);
        add_to_complex_shadow_field(e.detail.userCaps, e.detail.voice, "autovoices");
        create_tag_pools();
    });

    TT.emitter.on(EVENTS.AUTOVOICE_DELETED, e => {//        console.log("autovoicedeleted in POOLS", e);
        delete_from_shadow_field(e.detail.userLower, "autovoices", true);
        create_tag_pools();
    });

    TT.emitter.on(EVENTS.REPLACE_REMOVED, e => {
        console.log("RMOVE RPLACE", e.detail.term);
        delete_from_shadow_field(e.detail.term, "replace", "replacer");
        create_tag_pools();
    });

    TT.emitter.on(EVENTS.USER_ALWAYS_ALLOWED, on_allow_user);
    TT.emitter.on(EVENTS.USER_IGNORED, on_ignore_user);
        // clicking a message row transfers their name to the nickname page and replace term
    TT.emitter.on(EVENTS.MESSAGE_ROW_CLICK, e => {
        toast("Loaded <strong>" + e.detail.userCaps + "</strong>", "is-warning");
        if (e.detail.userCaps === undefined) console.log("UNDEFINED", e.detail);
        user_things_populate(e.detail.userCaps);
        gid("replaceterm").value = e.detail.userCaps;
        gid("replacewith").value = "";
    });

        // add emit types to pools - tags will emit their delete username with that type
        ///// ADD EMIT TYPES FOR POOLS ////
        ///// ADD EMIT TYPES FOR POOLS ////
        ///// ADD EMIT TYPES FOR POOLS ////

    gid("autoVoiceTagPool").dataset["emit"] = EVENTS.AUTOVOICE_DELETED;
    gid("nicknameTagPool").dataset["emit"] = EVENTS.NICKNAME_DELETED;
    gid("allowedTagPool").dataset["emit"] = EVENTS.USER_UNALLOWED;
    gid("ignoredTagPool").dataset["emit"] = EVENTS.USER_UNIGNORED;

    gid("replaceTagPool").dataset["emit"] = EVENTS.REPLACE_REMOVED;
    gid("replaceTagPool").dataset["type"] = "replaceterm";  // type is checked in on_tag_click

        ////////// EVENT LISTENERS //////////
        ////////// EVENT LISTENERS //////////
        ////////// EVENT LISTENERS //////////

    // click handler on the divs containing tags
    for (let tagContainer of qsa(".hide-buttons")) {
        tagContainer.addEventListener("click", on_tag_click);
    }
        // BUTTON ignore USERNAME CAPS, USER LOWER
    gid("ignoreuserbtn").addEventListener("click", x => {
        let userCaps = gid("username").value.trim();
        let userLower = userCaps.toLowerCase();
        TT.emit(EVENTS.USER_IGNORED, {userCaps, userLower });
        TT.emit(EVENTS.USER_UNALLOWED, {userCaps, userLower});
    })
        // BUTTON Always Allow
    gid("alwaysallowuserbtn").addEventListener("click", x => {
        let userCaps = gid("username").value.trim();
        let userLower = userCaps.toLowerCase();
        TT.emit(EVENTS.USER_UNIGNORED, {userCaps, userLower });
        TT.emit(EVENTS.USER_ALWAYS_ALLOWED, {userCaps, userLower});
    })
        // pressing enter on text fields subs
    // gid("username").addEventListener("change", user_data_change);
    // gid("nickname").addEventListener("change", user_data_change);

    gid("username").addEventListener("keyup", x => {
        if (x.key === "Enter") {
            nickname_voice_submit_handler();
        }
    });
    gid("nickname").addEventListener("keyup", x => {
        if (x.key === "Enter") {
            nickname_voice_submit_handler();
        }
    });

    gid("updateuser").addEventListener("click", nickname_voice_submit_handler);
    gid("voicecommand").addEventListener("change", nickname_voice_submit_handler);
}

//);

    /**
     * Form enter / voice select change / button pressed handler
     * @returns
     */

function nickname_voice_submit_handler() {//console.log("CHAAAAAAAAAAAAAAAAAAANGE");
    let userCaps = to_username( gid("username").value );

    gid("username").value = userCaps;

    let nickname    = gid("nickname").value.trim();
    let voice       = gid("voicecommand").value;
                                                            // console.log(user, nickname, voice);
    if (!userCaps) return;

    let userLower = userCaps.toLowerCase()

    if (nickname.length) {
        if (TT.config.nicknames[userLower] !== nickname)
            TT.emit(EVENTS.NICKNAME_ADDED, {userCaps, userLower, nickname});   // they'll have to work out if it's caps
    } else if (TT.config.nicknames[userLower] !== undefined){
        TT.emit(EVENTS.NICKNAME_DELETED, {userCaps, userLower});
    }

    if (voice.length) {
        if (TT.config.userAutoVoices[userLower] !== voice)
            TT.emit(EVENTS.AUTOVOICE_ADDED, {userCaps, userLower, voice});
    } else if ( TT.config.userAutoVoices[userLower] ) {
        TT.emit(EVENTS.AUTOVOICE_DELETED, {userLower, userLower});
    }
}


    /**
     * sets up a change on checkboxes that will show and hide delete buttons
     */

function delete_checkboxes_init() {
    let cboxes = qsa(".hide-button-toggle")

    for (let chk of cboxes) {
        chk.addEventListener("change", e => {
            let toggleOn = e.target.dataset["for"];
            if (e.target.checked)
                gid(toggleOn).classList.add("show-buttons");
            else
                gid(toggleOn).classList.remove("show-buttons");
        });
    }
}

    // these will actually be on the tag container divs

function on_tag_click(e) {
    //console.log(e.target.dataset, e.target);0
    //let user = "UKNOWN"; let from = "DOn'T Know";
    e.stopPropagation();

    let dataset = null;

    let type = e.target.constructor;

    switch (type) {
        case HTMLButtonElement:
                dataset = e.target.parentNode.dataset;
                let emitTypeForPool = e.target.parentNode.parentNode.dataset.emit;
                TT.emit(emitTypeForPool, dataset);

                break;
            case HTMLSpanElement:
                let pDset = e.target.parentNode.dataset;
                dataset = e.target.dataset;
                if (pDset.type === "replaceterm") {
                    replace_term_populate(dataset.term);
                    return;
                }
                user_things_populate(dataset.userCaps); // this may not be the case
            break;

        default:
            //console.log("No.");
            return;
    }

}

    /**
     * Populates the username field, the nickname and voice to use if they have them
     * @param {string} user's name
     */

export function user_things_populate(user) {
    let userLower = user.toLowerCase().trim();

    let nickName = TT.config.nicknames[userLower] ?? "";
    let vCmd = TT.config.userAutoVoices[userLower];

    let nameInput = gid("username");
    let nickInput = gid("nickname");
    //let voiceSelect = gid("voicecommand");

    nameInput.value = user;
    nickInput.value = nickName;

        // custom voice?
    if ( !voiceCmdSelect.select_val(vCmd) )
        !voiceCmdSelect.select_val("");
}




    ////////// TAG POOL CREATES //////////
    ////////// TAG POOL CREATES //////////
    ////////// TAG POOL CREATES //////////

export function create_tag_pools() {
    create_simple_tag_pool("allowedTagPool", "allownamed", EVENTS.USER_UNALLOWED);
    create_simple_tag_pool("ignoredTagPool", "ignoredusers", EVENTS.USER_UNIGNORED);

    create_key_value_pool("nicknameTagPool", "nicknames", ": ", EVENTS.NICKNAME_DELETED);
    create_key_value_pool("autoVoiceTagPool", "autovoices", ": !", EVENTS.AUTOVOICE_DELETED);

    create_replacer_pool("replaceTagPool", "replace", ": ", EVENTS.REPLACE_REMOVED);
}

    /**
     * Creates tags with a single text value
     * @param {string} poolId div where to put the tags
     * @param {*} inputFieldId an array to pull the tag text from
     */

function create_simple_tag_pool(poolId, inputFieldId) {
    let pool = gid(poolId);
    let data = gid(inputFieldId).value;
    //let users = split_to_array(data);
    let users = split_on_space_replace(data);
    users.sort( (a,b) => a.localeCompare(b) );

    remove_children(pool);

    for ( let u of users ) {
        let tag = create_tag(u);
        tag.dataset["userLower"] = u.toLowerCase();
        tag.dataset["userCaps"] = u;
        tag.dataset["from"] = inputFieldId;

        let delBtn = create_tag_del_button();
        tag.append(delBtn);
        pool.append(tag);
    }
}

    /**
     * Creates key: value tags
     * @param {string} poolId div where to put the tags
     * @param {string} inputFieldId a reference to a field to turn into a key/value object
     */

function create_key_value_pool(poolId, inputFieldId, separator = ": ") {
    let pool = gid(poolId);
    let data = gid(inputFieldId).value;
        // naturally sorted
        //console.log("COMPLEX POOL OBJ", pairObj);
    remove_children(pool);
        // parse the key pair string, turn to array and sort by key
    let pairObj = parse_key_value_string(data);
    let entries = Object.entries(pairObj).sort((a,b) => a[0].localeCompare(b[0]));

    for (let [userCaps, value] of entries) {
        //let value = pairObj[prop];
        let text = userCaps + separator + value;

        let tag = create_tag(text);
        tag.dataset["userLower"] = userCaps.toLowerCase();
        tag.dataset["userCaps"] = userCaps;
        tag.dataset["value"] = value;
        tag.dataset["from"] = inputFieldId;

        let delBtn = create_tag_del_button();
        tag.append(delBtn);
        pool.append(tag);
    }
}

    /**
     * Creates key: value tags
     * @param {string} poolId div where to put the tags
     * @param {string} inputFieldId a reference to a field to turn into a key/value object
     */

function create_replacer_pool(poolId, inputFieldId, separator = ": ") {
    let pool = gid(poolId);
    let data = gid(inputFieldId).value;
        // naturally sorted
        //console.log("COMPLEX POOL OBJ", pairObj);
    remove_children(pool);
        // parse the key pair string, turn to array and sort by key
    let terms = parse_term_replace_string(data);
    let entries = terms.sort( (a,b) => a.term.localeCompare(b.term));

    for (let {term, to} of entries) {
        let text = term + separator + to;

        let tag = create_tag(text);
        tag.dataset["term"] = term;

        let delBtn = create_tag_del_button();
        tag.append(delBtn);
        pool.append(tag);
    }
}

function create_tag(text, classis = "is-link") {
    let span = dce("span");
    span.classList.add('tag', classis, "is-medium", 'p-4', 'pr-1', 'm-2' );
    span.textContent = text;
    return span;
}

function create_tag_del_button(addClass="is-link") {
    let btn = dce("button");
    btn.classList.add("button", addClass, "is-small", "ml-1", "has-text-weight-bold");
    btn.textContent = "x";
    return btn;
}

    ////////// TAG POOL UPDATES //////////
    ////////// TAG POOL UPDATES //////////
    ////////// TAG POOL UPDATES //////////

    /**
     *  DECIDES it pool uses simple or complex shadow form field source
     * @param {string} user string of their name
     * @param {string} shadowInputId for element id of what will be a hidden text field
     * @param {mixed} isKeyPairField true = key value, false = simple field, "replacer" what it says
     */

function delete_from_shadow_field(user, shadowInputId, isKeyPairField = false) {
    let target = gid(shadowInputId);
    //let userLower =  to_username(user.toLowerCase());
    let userLower =  user.toLowerCase();//.replaceAll(SPACE_REPLACE, " ");

    switch (isKeyPairField) {
        case "replacer":
            del_from_replacer_field(shadowInputId, userLower);
            break;
        case true:
            del_from_key_value_field(shadowInputId, userLower);
            break;
        case false:
        default:
            del_from_simple_field(shadowInputId, userLower);
        break;
    }
}


    /**
     *
     * @param {string} user
     * @param {string} targetId id of form element to update
     * @returns
     */

function add_to_simple_shadow_field(user, targetId) {
    user = to_username( user );
    let field = gid(targetId);

    //let currUsers = split_to_array( field.value );
    let currUsers = split_on_space_replace( field.value );
    let currUsersLower = currUsers.map(x => x.toLowerCase());
    if (currUsersLower.includes(user.toLowerCase())) return;

    currUsers.push(user);
    field.value = currUsers.join(SPACE_REPLACE);
        // update the underlying
    trigger_onchange(field);
}

    /**
     * This is doing TWO jobs at once, updating the hidden field
     * @param {*} userCaps
     * @param {*} value
     * @param {*} targetId
     */

function add_to_complex_shadow_field(userCaps, value, targetId) {
    userCaps = to_username(userCaps);
    let userLower = userCaps.toLowerCase();
    let field = gid(targetId);
    let currUsers = parse_key_value_string(field.value);

        // delete a current key if it's the same.  They may want a case change

    for (let user in currUsers) {
        if (user.toLowerCase() === userLower) {
            delete currUsers[user];
            // break; no, in case multiples get in
        }
    }

    if (value.length)
        currUsers[userCaps] = value;

    field.value = to_key_value_string(currUsers);
    trigger_onchange(field);
}


function del_from_replacer_field(inputSrcId, term) {
    let target = gid(inputSrcId);
    let kvps = parse_term_replace_string(target.value);

    // for (let prop in kvps) {
    //     if (prop.toLowerCase() === term) {
    //         delete kvps[prop]; // deleted = true; break;
    //     }
    // }
    kvps = kvps.filter(x => x.term !== term);

    target.value = to_term_replace_string(kvps);

    trigger_onchange(target);
}


function del_from_key_value_field(inputSrcId, userLower) {
    let target = gid(inputSrcId);
    let kvps = parse_key_value_string(target.value);

    for (let prop in kvps) {
        if (prop.toLowerCase() === userLower) {
            delete kvps[prop]; // deleted = true; break;
        }
    }
    target.value = to_key_value_string(kvps);

    trigger_onchange(target);
}


function del_from_simple_field(inputSrcId, userLower) {
    let target = gid(inputSrcId);
    //let vals = split_to_array(target.value);
    let vals = split_on_space_replace(target.value);
    vals = vals.filter(x => x.toLowerCase() !== userLower);
    target.value = vals.join(SPACE_REPLACE);
    trigger_onchange(target);
}


    ////////// EVENT HANDLERS /////////
    ////////// EVENT HANDLERS /////////
    ////////// EVENT HANDLERS /////////


  // add user to always tag pool
function on_allow_user(e) {
    add_to_simple_shadow_field(e.detail.userCaps, "allownamed");
    create_tag_pools();
}
    // add user to ignored tag pool - username is capsed
function on_ignore_user(e) {
    add_to_simple_shadow_field(e.detail.userCaps, "ignoredusers");
    create_tag_pools();
}




    //////////// UTILS //////////
    //////////// UTILS //////////
    //////////// UTILS //////////

function to_username(name) {
    return name.replaceAll(/\W/g, "_")
}

function split_on_space_replace(txt) {
    return txt.split(SPACE_REPLACE).filter(e => e);
}

export function trigger_onchange(element) {
    let ev = new Event("change");
    element.dispatchEvent(ev);
}

function remove_children(el) {
    el.innerHTML = ""; return;
    let kids = el.childNodes;
    for (let kid of kids) {
        el.removeChild(kid);
    }
}
