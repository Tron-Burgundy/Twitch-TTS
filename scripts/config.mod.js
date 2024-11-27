import { to_key_value_string } from "./form-inout-filters.mod.js";

TT.config = TT.config ?? {}

const TMI_DEFAULT_CHANNELS = [];		// could put this in a different file for easy user use
const TMI_ALLOWED_DEFAULT = ["VeryNiceChap"];		// these do work
const TMI_IGNORE_DEFAULT = ["nightbot", "streamelements", "moobot", "streamlabs", "fossabot", "songlistbot"]; // LOWERCASE
const TMI_NICKNAMES_DEFAULT = {Example:"Nickname"}
const TMI_AUTOVOICES_DEFAULT = {Example: "ex"}

export const SPACE_REPLACE = "~";  // for others
export const VOICE_CMDS_QUERY = '[placeholder="!command"]';	// qsa for all the !foo voice commands

	///// TT.config setup /////
	///// TT.config setup /////

Object.assign(TT.config, // MOST tools add their config to this to make observing easy
{
	allowEveryone : true,
	allowMods : true,
	allowVips : true,
	allowSubs : true,
	allowNamed  : "",
	ignoredUsers: "",
	nicknames: "",

	autoVoiceMap: {},

	chatEnabled: false,

	joinDebounceSecs: 3,
});

export function set_form_defaults() {
	gid("ignoredusers").value = TMI_IGNORE_DEFAULT.join(SPACE_REPLACE);
	gid("allownamed").value = TMI_ALLOWED_DEFAULT.join(SPACE_REPLACE);
	gid("nicknames").value = to_key_value_string(TMI_NICKNAMES_DEFAULT);
	gid("autovoices").value = to_key_value_string(TMI_AUTOVOICES_DEFAULT);
	gid("s1").value = "ex"
}

TT.TTSVars = {       // more props added from forms
    flashSetTimeout: null,
    flashDuration: 3500,    // milliseconds
    flashFunc: x => x,      // does nothing for now
}


	///// TMI CLient options /////
	///// TMI CLient options /////

export const clientOpts = 	{
	connection: {
		secure: true,
		reconnect: true
	},
	identity: { // your id here if you want your bot to speak and not just observe
		//username: 'YourBotOrIdHere',
		//password: 'oauth:lah23h23hagb6glvv015d'
	},
	channels: []	// don't add defaults
};

	/**
	 * used in restore form values
	 */

export const FORM_RESTORE_CONFIG = {
	paramString: window.location.search,
	localStorageFallback: false,	// DEBUG for now
}