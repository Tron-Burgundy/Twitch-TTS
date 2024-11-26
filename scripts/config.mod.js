TT.config = TT.config ?? {}

const TMI_DEFAULT_CHANNELS = [];		// could put this in a different file for easy user use
const TMI_DEFAULT_ALLOW_NAMED = ["jo", "le", "taxi"];		// these do work
const TMI_IGNORE_DEFAULT = ["nightbot", "streamelements", "moobot", "streamlabs", "fossabot", "songlistbot"]; // LOWERCASE
const TMI_NICKNAMES_DEFAULT = {flipthatnoise:"Flip That Noise", drunkula: "Piss Weasel"}

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
	allowNamed  : TMI_DEFAULT_ALLOW_NAMED,
	ignoredUsers: TMI_IGNORE_DEFAULT,
	nicknames: TMI_NICKNAMES_DEFAULT,

	autoVoiceMap: {},

	chatEnabled: false,

	joinDebounceSecs: 3,
});



TT.TTSVars = {       // more props added from forms
    flashSetTimeout: null,
    flashDuration: 3500,    // milliseconds
    flashFunc: x => x,      // does nothing for now
        // updated by the speecher callbacks and speech parameter onchanges
    voices: [],
    sayCmds: {},
    voiceHashToIndex: new Map(),
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
	 *
	 * @param {string} selector selector for form items
	 * @param {string} paramString string to decode
	 * @param {bool} idIfNoName use element's id if no name
	 * @param {bool} localStorageFallback use localStorage if paramString fail
	 */

export const FORM_RESTORE_CONFIG = {
	paramString: window.location.search,
	localStorageFallback: false,	// DEBUG for now
	useCached: false	// use values in TT.initialUrlParamsToArray
}