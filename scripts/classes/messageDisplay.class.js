import { EVENTS } from "../event-constants.mod.js";

const $speechQDiv = gid('speechqueue');
const $speechQOldDiv = gid('speechqueueold');

//const TTSVars = TT.config.TTSVars;

const TTS_MSG_ID_PREFIX = "";
const ALLOW_CLASS = 'is-success';
const IGNORE_CLASS = 'is-danger';

$speechQDiv.addEventListener("click", msg_queue_buttons_click_handler);
$speechQOldDiv.addEventListener("click", msg_queue_buttons_click_handler);


export default class TTSMsgDisplay
{	// SCOPE

    constructor() {
        // TT.emitter.on("twitch:message", this.speech_queue_add_entry);   // oh no you don't!
    }

        /**
         *  Adds a line to the message display with buttons
         * @param {CustomEvent} msgPack so use .detail - I may change this
         */

	speech_queue_add_entry( msgPack ) {
		//console.log("SQ.add() GETS", data);
		let { message, messageid, userCaps, userLower, userid } = msgPack;	// user = caps, username = lower

		let frag = document.createDocumentFragment();

		let speechQRow = dce('nav');
		speechQRow.id = messageid;
		speechQRow.dataset.userLower = userLower;
		speechQRow.dataset.userCaps = userCaps;
		speechQRow.classList.add('speechQRow');

			// left = username (left, middle and right are flexbox items, order changed on media query)

		let usernameDiv = dce('div');
		usernameDiv.classList.add('speechQUser');
		usernameDiv.textContent = userCaps;

		let speech = dce('div');
		speech.classList.add('speechQText');
		speech.textContent = message;

			// right = buttons

		let buttons = dce('div')
		buttons.classList.add('speechQButtons');

			// DELETE BUTTON
			// DELETE BUTTON

		let btnDel = dce('button');
		// btnDel.dataset.messageid = messageid;
		// btnDel.dataset.userLower = userLower;
        btnDel.dataset.type = "delete";

		btnDel.textContent = 'del';
		btnDel.classList.add('button', 'is-warning', 'is-small', 'ml-2', 'deletebtn');

			// SKIP BUTTON
			// SKIP BUTTON

		let btnSkip = dce('button');
		// btnSkip.dataset.messageid = messageid;
		// btnSkip.dataset.userLower = userLower;
        btnSkip.dataset.type = "skip";

		btnSkip.textContent = 'skip';
		btnSkip.classList.add('button', 'is-link', 'is-small', 'ml-2', 'skipbtn');

			// BAN/IGNORE BUTTON
			// BAN/IGNORE BUTTON

		let btnBan = dce('button');
		btnBan.textContent = 'ignore user';
		btnBan.classList.add('button', 'is-danger', 'is-small', 'ignorebtn');
		btnBan.dataset.userLower = userLower;   // needed so we can find all buttons for a user
		// btnBan.dataset.userCaps = userCaps;	// user = cased, username = lower
        btnBan.dataset.type = "ignore";

		buttons.appendChild(btnBan);
		buttons.appendChild(btnDel);
		buttons.appendChild(btnSkip);

			// username - text - buttons
		speechQRow.append(usernameDiv, speech, buttons);

		frag.appendChild(speechQRow);
		$speechQDiv.appendChild(frag)
	}

        /**
         *
         * @param {*} id
         * @param {*} addIdTag
         * @param {*} colour bulma colour with is- so warning instead of is-warning
         * @param {*} addClasses space separated classes to add
         * @returns
         */

    speech_queue_entry_to_old_messages(id, addIdTag = null, colour = "info", addClasses = "") {
        let nid = gid(TTS_MSG_ID_PREFIX + id);

        if (!nid) {
            //console.log("*** ERROR: no speech queue entry with ID : "+id);
            return false;
        }
            // insert a div
        if (addIdTag) {
            speech_queue_add_tag(id, addIdTag, colour);
        }

        if (addClasses.length) {
            let classes = addClasses.split(" ").filter(x => x); // the filter removes empty entries on multiple spaces if you forget
            nid.classList.add(classes);
        }
            //$speechQOldDiv.appendChild(id);
        $speechQOldDiv.prepend(nid);
    }

    speech_queue_all_to_old_messages(tag = null) {
        let awaitingEntries = qsa("#speechqueue nav");
            // reverse them
        awaitingEntries.reverse();

        for (let entry of awaitingEntries) {
            this.speech_queue_entry_to_old_messages(entry.id, "Cancelled", "warning");
        }
    }

        // limits the elements in the old queue

    speech_queue_old_prune(limit = 30) {
        //console.log("LIMIT:", limit, "Length:", $speechQOldDiv.children.length);
        while ($speechQOldDiv.children.length > limit) {
            $speechQOldDiv.lastChild.remove();
        }
    }

    remove_msg(msgid) {
        gid(TTS_MSG_ID_PREFIX + msgid)?.remove();
    }

    ignore_user(username) {
        let userIgnoreBtns = get_user_ignore_btns(username);	// for changing allows

        for (let iBtn of userIgnoreBtns) {
            iBtn.dataset.type = "unignore";
            iBtn.textContent = "allow user";
            iBtn.classList.remove(IGNORE_CLASS);
            iBtn.classList.add(ALLOW_CLASS);
        }
            //speech_queue_entry_freeze(id);	// stop the entry from being removed by a speech end event
        this.user_messages_to_old(username, "ignored", "success")
    }


    unignore_user(username) {
        let userIgnoreBtns = get_user_ignore_btns(username);

        for (let iBtn of userIgnoreBtns) {
            iBtn.dataset.type = "ignore";
            iBtn.textContent="ignore user";
            iBtn.classList.remove(ALLOW_CLASS);
            iBtn.classList.add(IGNORE_CLASS);
        }
    }


    user_messages_to_old(username, tag, colour) {
        let sqUpcomingEntries = get_user_upcoming_msgs(username); // ban buttons have user and data-id
        for (let upcomingEntry of sqUpcomingEntries) {	// only add tags to messages in main queue
            this.speech_queue_entry_to_old_messages(upcomingEntry.id);
            speech_queue_add_tag(upcomingEntry.id, tag, colour);
        }
    }

    speech_started(data) {
        console.log("SPEECH HAS STARTED", data);
    }
} // class end




    /**
     * This DOESN'T need to be part of this display class - it could just emit and us listen for the event
     * Click handler for the 3 PARENT divs holding messages.
     * @param {pointerEvent} e
     * @returns
     */

function msg_queue_buttons_click_handler(e) {
    e.stopPropagation();
    let btn = e.target;

    if (btn.constructor === HTMLButtonElement) {
        let type = btn.dataset.type;
        let nav = btn.parentNode.parentNode;
        let dataset = {messageid: nav.id, ...nav.dataset};

        switch (type) {
            case "ignore":
                TT.emit(EVENTS.USER_IGNORED, dataset);
                break;

            case "unignore":
                TT.emit(EVENTS.USER_UNIGNORED, dataset);
                break;

            case "delete":
                TT.emit(EVENTS.MESSAGE_DELETED, dataset);
                break;

            case "skip":
                TT.emit(EVENTS.MESSAGE_SKIPPED, dataset);
                break;

            default:
                return;
        }
        return;
    }
        // emit that a row was clicked
        // row clicks sometimes hit the container behind the row
    let row = e.target;

    if (e.target.nodeName !== "NAV") {
        row = row.parentNode;

        if (row.nodeName !== "NAV")
            return; // we've hit the backboard
    }

    TT.emit(EVENTS.MESSAGE_ROW_CLICK, {...row.dataset, id:row.id});
}

		// colour can be info black dark light white primary link info success warning danger
		// "danger is-light" could also be used
function speech_queue_add_tag(id, text, colour = "info") {
    let nid = gid(TTS_MSG_ID_PREFIX + id);

    if (!nid) {
        return;
    }

    let tagSpan = document.createElement("span");
    tagSpan.innerText = text;
    tagSpan.className = `tag is-${colour} mr-1`;
    nid.prepend(tagSpan);
}



function get_user_ignore_btns(user) {
    return qsa(`.ignorebtn[data-user-lower="${user.toLowerCase()}"]`);
}

function get_user_upcoming_msgs(user) {
    return qsa(`#speechqueue nav[data-user-lower="${user.toLowerCase()}"]`);
}