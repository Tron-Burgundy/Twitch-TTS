/**
 * Twitch message receiver and emitter
 * Received messages will be permission checked and emote filtered before the
 * decision to emit
 *
 * events: twitch:message twitch:ban twitch:messagedeleted twitch:timeout twitch:chatcleared twitch:notice
 */
import "./tmi.min.js"
import { clientOpts } from "../config.mod.js"
import Emoter from "../classes/emoter.class.js"
import EVENTS from "../event-constants.mod.js";

window.TT = window.TT ?? {}

export const cclient = new tmi.Client(clientOpts);
TT.cclient = cclient;
console.log("Twitch client:", cclient);

const emoter = new Emoter();	// messages will be filtered before emitting

    // connect returns a promise
TT.config.tmiConnected = cclient.connect();	// don't join here if you prefill channels in clientOpts
	// returns promise. cclient.ws.readyState = 1 when connected, ws = null before connection


cclient.on("message", tmi_message_handler);
cclient.on('messagedeleted', message_twitch_msg_deleted_handler);
cclient.on('ban', message_twitch_ban_handler);
cclient.on('raw_message', message_twitch_raw_clearchat_handler); // handles bans/timeouts if CLEARCHAT appears
cclient.on('notice', message_twitch_notice_handler); // currently just logs the notice

	// keep track of users and channels between calls - they don't need to be exposed but just for debugs/funs

function tmi_message_handler(channel, userstate, message, self) {
	const messageOriginal = message;

	if (self || TT.TTSVars.chatEnabled === false) return;
// DEBUG - just to stop the everything listern annoying me
	if (TT.config.chatEnabled != true) return;
		// are they permitted ?
	if (! user_permitted( userstate )) {            // console.debug("USER NOT PERMITTED", userstate['username']);
		return false;
	}
		// return if the message type isn't readable
	switch(userstate["message-type"]) {
		case "action": case "chat": //case "whisper":
			break;
		default:
			return;
	}

		// EMOTE FILTERING

	if ( ! TT.TTSVars.chatReadEmotes ) {
		message = emoter.filter(message, userstate);
	}

	message = message.trim();	// needs to be more agressive as sometimes invisible chars remain
		// any message left?  I've noticed blank messages which just contain unprintable characters
	if (message.length === 0) { //console.log("message zero returning");
		return;
	}

		// COOLDOWN CHECK

	TT.emit(EVENTS.TWITCH_MESSAGE, {
		message,
		messageOriginal,
		userCaps: userstate["display-name"],
		userLower: userstate["username"],
		messageid: userstate["id"],
		userid: userstate["user-id"],
		userstate,
		channel
	});
}



// CLEARMSG is something I saw command: CLEARMSG, params[username, message], tags {messagedeleted, target-msg-id}
// on, we've got "messagedeleted" handler for that

    // CLEARCHAT happens on /ban /timeout or /clear
	// params has 1 or 2 entries.  1 for whole room cleared, 2 for room and user
	// :tmi.twitch.tv CLEARCHAT #dallas for entire room
	// :tmi.twitch.tv CLEARCHAT #dallas :aSingleUser
	/* command
:
"CLEARCHAT"
params:Array(2)
0:"#drunkula"
1:"auntiebrenda"
raw:"@ban-duration=10;room-id=472548624;target-user-id=576952126;tmi-sent-ts=1731767348213 :tmi.twitch.tv CLEARCHAT #drunkula :auntiebrenda"
tags:
	ban-duration: "10"
	room-id:"472548624"
	target-user-id:"576952126"
	tmi-sent-ts:"1731767348213"
*/


function message_twitch_raw_clearchat_handler(clone, message) {
	//if (message.command === "PONG" || message.command === "PING") return;	//console.log("RAW RAW MESSAGE", message );

		// 1 param = whole room, 2 = single user

	if (message.command === "CLEARCHAT") {// && message.params.length > 1) {
		if (message.params.length === 1) {
			let msg = {channel: message.params[0], "room-id": message.tags["room-id"], "tmi-sent-ts": message.tags["tmi-sent-ts"]}
			TT.emit(EVENTS.TWITCH_CHAT_CLEARED, msg);
			return;
		}

		if (message.params.length > 1) {
			let [channel, username] = message.params;
			let msg = {
				channel, username, userid: message.tags["target-user-id"],
				duration: message.tags["ban-duration"], "room-id": message.tags["room-id"],
				"tmi-sent-ts": message.tags["tmi-sent-ts"]
			}
			TT.emit(EVENTS.TWITCH_TIMEOUT, msg);
			return;
		}
	}
}

	// ban handler.  Bans send username in lower case and in userstate
	// room-id target-user-id tmi-sent-ts

function message_twitch_ban_handler(channel, username, reason, userstate) {
	TT.emit(EVENTS.TWITCH_BANNED, {channel, username, reason, userstate});
}

	// moderated messages can be discarded.  Only MANUALLY modded

function message_twitch_msg_deleted_handler(channel, username, deletedMessage, userstate) {
	TT.emit(EVENTS.TWITCH_MESSAGE_DELETED, {
		channel, username, deletedMessage, userstate, messageid: userstate["target-msg-id"]
	});
}


	// is the automod in notices?  I've never even seen a notice

function message_twitch_notice_handler(channel, messageid, message) {
	TT.emit(EVENTS.TWITCH_NOTICE, {channel, messageid, message});
	console.log("Notice received msgid, message", messageid, message);
}



	 // joins channels in the text input, departs those not in the list if connected

	/**
	 *	Joins the channels specified if not joined and leaves any if they're not in the list
	 * @param {string} channels space separated list of channels
	 */

TT.join_chans = async function join_chans(channels) {
	await TT.config.tmiConnected;

		// split string to array
	channels = channels.replace(/\W/g, " ").split(" ").filter(x => x);
	channels = channels.map(x => x = '#'+x.toLowerCase()) ;

	// leave channels and join channels
	let currChans = cclient.getChannels();
	console.debug(`cclient chans before join/part`, currChans);

		// join / part channels
	for (let ch of currChans) { // part chans not in the new list
		if (!channels.includes(ch))
		cclient.part(ch).catch(e => console.debug(e));
	}
	for (let ch of channels) {  // join chans not in the current list
		if (!currChans.includes(ch))
			cclient.join(ch).catch(e => console.debug(e));
	}
}


		// user allowed to do the command?  This doesn't need to be public if we do the filtering here and emit

function user_permitted(userstate) {
	let allowed = false;

	switch (true) {	// block first
		case TT.config.ignoredUsers.includes(userstate.username):
			allowed = false;
			break;
		case TT.config.allowEveryone:
		case TT.config.allowMods && userstate.mod:
		case TT.config.allowVips && userstate.badges && userstate.badges.vip === "1":
		case TT.config.allowSubs && userstate.subscriber:
		case TT.config.allowNamed.includes(userstate.username):
		case userstate.badges && userstate.badges.broadcaster === "1":
			allowed = true;
			break;

		default:
			allowed = false;
			break;
	}

	return allowed;
}

	/**
	 * Filter
	 */

cclient.on('roomstate', async (chan, state) => {
	console.log("Getting bttv / franker for ", chan, `room id ${state['room-id']}`);
	let results = await emoter.fetch(state['room-id']);
	console.log("Emoter fetch for", chan, results);
})









/*
// join (and roomstate) can be used to check if we've joined a channel
cclient.on('join', function (channel, username) {
    if (username == cclient.getUsername()) {
        console.debug(c('Joined'),`${channel} as ${username} : cclient.channels now : `, cclient.getChannels());
        log('<b style="color: cyan">Joined:</b> ' + channel);
    }
})

    // sent when any user leaves a channel, self means it's us
cclient.on('part', (channel, username, self) => {
    if (self) {
        console.debug('Parted', channel, username);
        log('<b style="color: magenta">Left channel:</b> ' + channel);
    }
})

    // let's see if I can catch the _promiseJoin fail event tmi.js linke 2523
cclient.on('_promiseJoin', function(error, channel) {
    if (error) {
        console.debug(y('NOTICE :'),'join error for', channel, error);
        log(`<b style="color:yellow">NOTICE</b> Could not join channel: ${channel}`);
    }
});

cclient.on("disconnected", (reason) => {
    log('Disconnected : ' + reason)
    console.debug("Disconnected:", reason);
});
 */

