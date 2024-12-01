TT.emitter.on(EVENTS.TWITCH_MESSAGE_DELETED, e => {
    if (!TT.config.chatRemoveModerated) return;
    let {channel, username, deletedMessage, userstate, messageid} = e.detail;
    // msgDisp.remove_msg(messageid);  // this deletes it - I'd prefer to know
    speech.cancel_id(messageid);
    msgDisp.speech_queue_entry_to_old_messages(message, "modded", colour);
});

TT.emitter.on(EVENTS.TWITCH_BANNED, e => {
    let {channel, username, reason, userstate} = e.detail;
    speech.cancel_user_messages(username);
    msgDisp.user_messages_to_old(username, "banned", "danger");
});

TT.emitter.on(EVENTS.TWITCH_CHAT_CLEARED, e => {
    let {channel, "room-id": roomid, "tmi-sent-ts": time} = e.detail;
});

TT.emitter.on(EVENTS.TWITCH_TIMEOUT, e => {
    let {channel, username, duration, userid, "room-id": roomid, "tmi-sent-ts": time} = e.detail;
    speech.cancel_user_messages(username);
    msgDisp.user_messages_to_old(username, "timeout", "warning");
});






    // is the automod in notices?  I've never even seen a notice

function message_twitch_notice_handler(channel, msgid, message) {
    console.log("Notice received msgid, message", msgid, message);
}

//Message deleted
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