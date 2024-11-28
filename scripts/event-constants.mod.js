/**
 * ? Should I have 'tenses' for these like user:deleteuser user:userdeleted
 * If everyone's doing their job right then no as long as everyone acts like it's happening now matter what.
 */

export const EVENTS = {
    USER_IGNORED: "user:ignored",
    USER_UNIGNORED: "user:unignored",
    USER_UNALLOWED: "user:unallowed",
    USER_ALWAYS_ALLOWED: "user:alwaysallowed",
    USER_BANNED: "user:banned",
    USER_TIMEOUT: "user:timeout",

    NICKNAME_ADDED: "user:nicknameadded",
    NICKNAME_DELETED: "user:nicknamedeleted",
    AUTOVOICE_ADDED: "user:autovoiceadded",
    AUTOVOICE_DELETED: "user:autovoicedeleted",

    TWITCH_MESSAGE: "twitch:message",
    TWITCH_MESSAGE_DELETED: "twitch:messagedeleted",
    TWITCH_NOTICE: "twitch:notice",
    TWITCH_BANNED: "twitch:banned",
    TWITCH_TIMEOUT: "twitch:timeout",
    TWITCH_CHAT_CLEARED: "twitch:chatcleared",

    SPEECHER_ERROR: "speecher:error",
    SPEECHER_START: "speecher:start",
    SPEECHER_END: "speecher:end",
    SPEECHER_BEFORE_SPEAK: "speecher:beforespeak",
    SPEECHER_CANCELLED: "speecher:cancelled",
    SPEECHER_CANCELLED_CURRENT: "speecher:cancelledcurrent",
    SPEECHER_REJECTED: "speecher:rejected",
    SPEECHER_VOICES_CHANGED: "speecher:voiceschanged",
    SPEECHER_READY: "speecher:ready",

    SPEECH_DISABLED: "speech:disabled",
    SPEECH_ENABLED: "speech:enabled",
    SPEECH_PAUSED:   "speech:paused",
    SPEECH_RESUMED: "speech:resumed",

    MESSAGE_DELETED: "message:deleted",

    MESSAGE_ROW_CLICK: "message:rowclick",

    QUERY_PARAMS_CHANGED: "url:paramschanged",
    QUERY_PARAMS_UNCHANGED: "url:paramssameasonload",
}

export default EVENTS;