/* tags have CAP CASED data-user

 Nickname / autvoices have an associated hidden form field
TheUserName(The~Nick~Name)OtherUser(Nikky)

We want to preserve the case for this when saving even though the keys are lower case (caused by onchange)

easy way
parse to an object
    parse_equal_pairs_from_url
add/delete the key we want (key cased)
set value of field with
    form_out_not_needed_equal_pairs_to_url

trigger onchange

    EMIT userignored and userunignored where necessary
Ignored users
split to array

*/

import { parse_key_value_string, to_key_value_string, split_to_array } from "./form-inout-filters.mod.js";
import { SPACE_REPLACE } from "./config.mod.js";
import EVENTS from "./event-constants.mod.js";
import { voiceCmdSelect } from "./voice-selects-setup.mod.js";

cclog("HEYYYYYYYYYYYYYYYY Tag Pools.mod LOADED AGAIN", "m");

var initialised = false;

    //// MAIN ////
    //// MAIN ////

// window.addEventListener("load",

export function init_tag_pools() {
    if (initialised) return;
    initialised = true;

    delete_checkboxes_init(); // should this go to the master?  Your faith against the master's

cclog("TAG POOLS INIT please be LOADED only ONCE", "m");
        ///// ADD HANDLERS /////
    TT.emitter.on(EVENTS.USER_IGNORED, e => { //       console.log("IGNORED in pools", e);
        delete_from_tag_pool(e.detail.userLower, "allownamed", false);
    });

    TT.emitter.on(EVENTS.USER_UNALLOWED, e => {       console.log("unallowed in pools", e);
        delete_from_tag_pool(e.detail.userLower, "allownamed", false);
    });

    TT.emitter.on(EVENTS.USER_UNIGNORED, e => { //       console.log("UNIGNORED in POOLS", e);
        delete_from_tag_pool(e.detail.userLower, "ignoredusers", false);
    });

    TT.emitter.on(EVENTS.NICKNAME_ADDED, e => { //       console.log("nicknamedeleted in POOLS", e);
        console.log("NIC ADD", e.detail);
        add_to_complex_pool(e.detail.userCaps, e.detail.nickname, "nicknames");
    });

    TT.emitter.on(EVENTS.NICKNAME_DELETED, e => { //       console.log("nicknamedeleted in POOLS", e);
        console.log("DELETED GOT", e.detail);
        delete_from_tag_pool(e.detail.userLower, "nicknames", true);
    });

    TT.emitter.on(EVENTS.AUTOVOICE_ADDED, e => {//        console.log("autovoicedeleted in POOLS", e);
        add_to_complex_pool(e.detail.userCaps, e.detail.voice, "autovoices");
    });

    TT.emitter.on(EVENTS.AUTOVOICE_DELETED, e => {//        console.log("autovoicedeleted in POOLS", e);
        delete_from_tag_pool(e.detail.userLower, "autovoices", true);
    });

    TT.emitter.on(EVENTS.USER_ALWAYS_ALLOWED, on_allow_user);
    TT.emitter.on(EVENTS.USER_IGNORED, on_ignore_user);
        // clicking a message row transfers their name to the nickname page.
    TT.emitter.on(EVENTS.MESSAGE_ROW_CLICK, e => {
        toast("Loaded <strong>" + e.detail.userCaps + "</strong>", "is-warning");
        user_things_populate(e.detail.userCaps);
    });

        // add emit types to pools - tags will emit their delete username with that type
        ///// ADD EMIT TYPES FOR POOLS ////
        ///// ADD EMIT TYPES FOR POOLS ////
        ///// ADD EMIT TYPES FOR POOLS ////

    gid("autoVoiceTagPool").dataset["emit"] = EVENTS.AUTOVOICE_DELETED;
    gid("nicknameTagPool").dataset["emit"] = EVENTS.NICKNAME_DELETED;
    gid("allowedTagPool").dataset["emit"] = EVENTS.USER_UNALLOWED;
    gid("ignoredTagPool").dataset["emit"] = EVENTS.USER_UNIGNORED;

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
            user_data_change();
        }
    });
    gid("nickname").addEventListener("keyup", x => {
        if (x.key === "Enter") {
            user_data_change();
        }
    });

    gid("updateuser").addEventListener("click", user_data_change);
    gid("voicecommand").addEventListener("change", user_data_change);
}

//);

    /**
     * Form enter / voice select change / button pressed handler
     * @returns
     */

function user_data_change() {//console.log("CHAAAAAAAAAAAAAAAAAAANGE");
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

        // unsets the cleckboxes for all - delete buttons - set on top nav buttons click

function uncheck_tag_delete_boxes_clear() {
    let buttons = qsa(".hide-button-toggle");
    let change = new Event("change");

    for (let btn of buttons) {
        btn.checked = false;
        btn.dispatchEvent(change);
    }
}

    // these will actually be on the tag container divs

function on_tag_click(e) {
    //console.log(e.target.dataset, e.target);0
    //let user = "UKNOWN"; let from = "DOn'T Know";
    e.stopPropagation();

    let dataset = null;

    let type = e.target.constructor;
    //console.log("ON TAG CLICK", e);

    switch (type) {
        case HTMLButtonElement:
                dataset = e.target.parentNode.dataset;
                let emitTypeForPool = e.target.parentNode.parentNode.dataset.emit;
                TT.emit(emitTypeForPool, dataset);

                break;
            case HTMLSpanElement:
                dataset = e.target.dataset;
                user_things_populate(dataset.userCaps);
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
}

    /**
     * Creates tags with a single text value
     * @param {string} poolId div where to put the tags
     * @param {*} inputFieldId an array to pull the tag text from
     */

function create_simple_tag_pool(poolId, inputFieldId) {
    let pool = gid(poolId);
    let data = gid(inputFieldId).value;
    let users = split_to_array(data);
    //let users = split_on_space_replace(data);

    users.sort( (a,b) => a.localeCompare(b) );
console.log("SIMPLE TAG POOL GOT", users);
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
     * @param {string} inputSrcId for element id of what will be a hidden text field
     * @param {boolean} isKeyPairField whether to use an array split or a key pair split
     */

function delete_from_tag_pool(user, inputSrcId, isKeyPairField = false) {
    let target = gid(inputSrcId);
    let userLower =  to_username(user.toLowerCase());

    if (isKeyPairField) {  //console.log("IT IS COMPLAX", target.value);
        del_from_key_value_field(inputSrcId, userLower);
    } else {
        del_from_simple_field(inputSrcId, userLower);
    }

    create_tag_pools();
}


    /**
     *
     * @param {string} user
     * @param {string} targetId id of form element to update
     * @returns
     */

function add_to_simple_pool(user, targetId) {
    user = to_username( user );
    let field = gid(targetId);

    let currUsers = split_to_array( field.value );
    // let currUsers = split_on_space_replace( field.value );
    let currUsersLower = currUsers.map(x => x.toLowerCase());
    if (currUsersLower.includes(user.toLowerCase())) return;

    currUsers.push(user);
    field.value = currUsers.join(SPACE_REPLACE);
        // update the underlying
    trigger_onchange(field);
    create_tag_pools();
}

function add_to_complex_pool(userCaps, value, targetId) {
    userCaps = to_username(userCaps);
    let userLower = userCaps.toLowerCase();
    let field = gid(targetId);
    let currUsers = parse_key_value_string(field.value);
    //console.log("ADDING TO THIS THING,", currUsers);

        // delete a current key if it's the same.  They may want a case change

    for (let user in currUsers) {
        if (user.toLowerCase() === userLower) {
            delete currUsers[user];
            // break; in case multiples get in
        }
    }

    if (value.length)
        currUsers[userCaps] = value;

    field.value = to_key_value_string(currUsers);
    trigger_onchange(field);
    create_tag_pools();
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
    let vals = split_to_array(target.value);
    // let vals = split_on_space_replace(target.value);
    vals = vals.filter(x => x.toLowerCase() !== userLower);
    target.value = vals.join(SPACE_REPLACE);
    trigger_onchange(target);
}


    ////////// EVENT HANDLERS /////////
    ////////// EVENT HANDLERS /////////
    ////////// EVENT HANDLERS /////////


  // add user to always tag pool
function on_allow_user(e) {
    add_to_simple_pool(e.detail.userCaps, "allownamed");
}
    // add user to ignored tag pool - username is capsed
function on_ignore_user(e) {
    add_to_simple_pool(e.detail.userCaps, "ignoredusers");
}


function on_add_to(dataset) {
    console.log("ADDING TO", dataset);
}


    //////////// UTILS //////////
    //////////// UTILS //////////
    //////////// UTILS //////////

function to_username(name) {
    return name.replaceAll(/\W/g, "_")
}

function split_on_space_replace(txt) {
    return txt.split(SPACE_REPLACE);
}

function trigger_onchange(element) {
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
