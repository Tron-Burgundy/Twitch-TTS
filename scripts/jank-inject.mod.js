/** CHAT-TO-SPEECH-JANK.js
 * Injects the old janky TTS function into the TTSMain namespace.  The borked version is fun.
 */

JANK has been added in the new version

console.log("########## INJECTING JANKY JANKERSON ############")
    // this janky version references the 'global' TT.config.TTSVars.sayCmds
TTSMain.get_voice_settings_by_name = function (name) {
    return TT.config.TTSVars.sayCmds[name];
}

sayCmds is object {!ptt: {pitch, rate, voice}, !foo: {pitch, rate, voice}}

MESSAGE HANDLER is where jank is injected
NOT QueueProcess
SO:

params = objectReference(byName)  <--- {!cmd: {pitch, rate, voice}, !someOther: {pitch,rate,voice}}

then params.text = "My speek"

<--- {!someName: {!ptt: {pitch, rate, voice, text}}
    that is !someName.text = "My speek"




get_voice_settings_by_name is used when:
   !voiceCommand is used or
   user has a voice command so this needs to be done in the HANDLER


In the handler we check

starts_with_voice_command

if ( isSayCommand )
    use get_voice_settings_by_name
else {
    is ( personalVoice )
        use get_voice_settings_by_name
    else
        use get_voice_by_index <-- returns {rate, pitch, voice} so NOT part of the jank machine
}


SO - if it's a say command or a personal voice that has a say command I should store the pack
in an object indexed by the voice command and return it

/*  // fixed version  return {...TTSVars.sayCmds[name]};

How did it work?  So you grabbed voice params (a reference)

voiceParams = ns.get_voice_settings_by_name(nameIsCmd)

Then later these set .text IN the settings it references

//// IN twitch_message_handler

if (sameUser && sameChannel &&
    TTSVars.chatNoNameRepeatSeconds && userstate["tmi-sent-ts"] - TTSVars.lastMsgTime <= TTSVars.chatNoNameRepeatSeconds * 1000) {
        voiceParams.text = message;
    } else {
        voiceParams.text = add_speech_before_after(message, userstate, channel);
}

speech.say(voiceParams); <--- speecher passed the package

//// END OF twitch_message_handler

Speecher.say(pack) puts the pack into a queue then:

sayQueueProcess()
    #processUtterance(pack)
        in it essentially this.utterance = new SpeechSynthesisUtterance(pack.text)
            pack is still pointing to the voice settings
            And voiceSettings.text may have been mutated by more messages coming in

    this.ss.speak(this.utterance)
*/

MY NEW VARS:

TT.config.autoVoiceMap IS an object just like sayCmds with cmd: {pitch, rate, voice}, cmd2: {...}
TT.config.userVoices ALSO an object with drunkula: "drunk", flipthatnoise: "ftn"

let messageDeleted = {
    channel: "#drunkula",
    deletedMessage: "ok you want to time me out or something",
    messageid:"2011cf14-66b9-4c9f-a261-046554bccf2a",
    username:"auntiebrenda",
    userstate:{
        login: 'auntiebrenda',
        "room-id": '472548624',
        "target-msg-id": '2011cf14-66b9-4c9f-a261-046554bccf2a',
        "tmi-sent-ts": '1733012402823',
        "message-type": 'messagedeleted'}
}


//Chat Cleared message
let clearchatMessage = {
    command:"CLEARCHAT",
    params:['#drunkula'],
    prefix:"tmi.twitch.tv",
    raw:"@room-id=472548624;tmi-sent-ts=1733012489103 :tmi.twitch.tv CLEARCHAT #drunkula",
    tags:{
        "room-id": '472548624',
        "tmi-sent-ts": '1733012489103'
    }
}


//Timeout
let timeoutMessage = {
    command:"CLEARCHAT",
    params: ['#drunkula', 'auntiebrenda'],
    prefix:"tmi.twitch.tv",
    raw:"@ban-duration=600;room-id=472548624;target-user-id=576952126;tmi-sent-ts=1733012659685 :tmi.twitch.tv CLEARCHAT #drunkula :auntiebrenda",
    tags:{
        "ban-duration": '600',
        "room-id": '472548624',
        "target-user-id": '576952126',
        "tmi-sent-ts": '1733012659685'
    }
}