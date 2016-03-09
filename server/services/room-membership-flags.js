'use strict';

var StatusError = require('statuserror');

/* Note, these can not change! */
/* -----8<---- */
var FLAG_POS_NOTIFY_UNREAD       = 0;
var FLAG_POS_NOTIFY_ACTIVITY     = 1;
var FLAG_POS_NOTIFY_MENTION      = 2;
var FLAG_POS_NOTIFY_ANNOUNCEMENT = 3;
var FLAG_POS_NOTIFY_DEFAULT      = 4;

/* -----8<---- */

var BITMASK_INVERT = 0x0FFFFFFF;
var BITMASK_MODE = 1 << FLAG_POS_NOTIFY_UNREAD |
                   1 << FLAG_POS_NOTIFY_ACTIVITY |
                   1 << FLAG_POS_NOTIFY_MENTION |
                   1 << FLAG_POS_NOTIFY_ANNOUNCEMENT;

var BITMASK_MODE_DEFAULT = BITMASK_MODE | 1 << FLAG_POS_NOTIFY_DEFAULT;

var BITMASK_INVERT_MODE_DEFAULT = BITMASK_INVERT & ~BITMASK_MODE_DEFAULT;

var BITMASK_NOTIFY_UNREAD       = 1 << FLAG_POS_NOTIFY_UNREAD;
var BITMASK_NO_NOTIFY_UNREAD    = BITMASK_INVERT & ~BITMASK_NOTIFY_UNREAD;
var BITMASK_NOTIFY_ACTIVITY     = 1 << FLAG_POS_NOTIFY_ACTIVITY;
var BITMASK_NO_NOTIFY_ACTIVITY  = BITMASK_INVERT & ~BITMASK_NOTIFY_ACTIVITY;
var BITMASK_NOTIFY_MENTION      = 1 << FLAG_POS_NOTIFY_MENTION;
var BITMASK_NOTIFY_ANNOUNCEMENT = 1 << FLAG_POS_NOTIFY_ANNOUNCEMENT;
var BITMASK_NOTIFY_DEFAULT      = 1 << FLAG_POS_NOTIFY_DEFAULT;

var MODES = {
  /* Mode: all: unread + no activity + mentions + announcements */
  all: BITMASK_NOTIFY_UNREAD | BITMASK_NOTIFY_MENTION | BITMASK_NOTIFY_ANNOUNCEMENT,

  /* Mode: announcement: no unread + activity + mentions + announcements */
  announcement: BITMASK_NOTIFY_ACTIVITY | BITMASK_NOTIFY_MENTION | BITMASK_NOTIFY_ANNOUNCEMENT,

  /* Mode: mute: no unread + no activity + mentions + no announcements */
  mute: BITMASK_NOTIFY_MENTION,
};

/* Alias modes */
MODES.mention = MODES.announcement;


function getModeFromFlags(flags) {
  switch(flags & BITMASK_MODE) {
    case MODES.all:
      return 'all';
    case MODES.announcement:
      return 'announcement';
    case MODES.mute:
      return 'mute';
  }

  // TODO: deal with 'unknown' modes better
  return null;
}

function getUpdateForMode(mode, isDefault) {
  if (!MODES.hasOwnProperty(mode)) {
    throw new StatusError(400, 'Invalid mode ' + mode);
  }

  var setBits = MODES[mode];

  /* Set the 'default setting' bit if this is a default */
  if (isDefault) {
    setBits = (setBits | BITMASK_NOTIFY_DEFAULT);
  }

  var clearBits = BITMASK_INVERT_MODE_DEFAULT | setBits;

  var lurk = !(setBits & BITMASK_NOTIFY_UNREAD);

  return {
    $set: { lurk: lurk },
    $bit: { flags: { or: setBits, and: clearBits } }
  };
}

function getFlagsForMode(mode, isDefault) {
  if (!MODES.hasOwnProperty(mode)) {
    throw new StatusError(400, 'Invalid mode ' + mode);
  }

  var flags = MODES[mode];
  if (isDefault) {
    return flags | BITMASK_NOTIFY_DEFAULT;
  } else {
    return flags;
  }
}

function toggleLegacyLurkMode(flags, isLurk) {
  isLurk = !!isLurk;

  if (getLurkForFlags(flags) === isLurk) {
    return flags;
  }

  if (isLurk) {
    return flags & BITMASK_NO_NOTIFY_UNREAD | BITMASK_NOTIFY_ACTIVITY;
  } else {
    return flags & BITMASK_NO_NOTIFY_ACTIVITY | BITMASK_NOTIFY_UNREAD;
  }

}

function getLurkForFlags(flags) {
  return !(flags & BITMASK_NOTIFY_UNREAD);
}

function getLurkForMode(mode) {
  if (!MODES.hasOwnProperty(mode)) {
    throw new StatusError(400, 'Invalid mode ' + mode);
  }

  return getLurkForFlags(MODES[mode]);
}


function hasNotifyUnread(flags) {
  return flags & BITMASK_NOTIFY_UNREAD;
}

function hasNotifyActivity(flags) {
  return flags & BITMASK_NOTIFY_ACTIVITY;
}

function hasNotifyMention(flags) {
  return flags & BITMASK_NOTIFY_MENTION;
}

function hasNotifyAnnouncement(flags) {
  return flags & BITMASK_NOTIFY_ANNOUNCEMENT;
}

module.exports = {
  MODES: MODES,

  FLAG_POS_NOTIFY_UNREAD: FLAG_POS_NOTIFY_UNREAD,
  FLAG_POS_NOTIFY_ACTIVITY: FLAG_POS_NOTIFY_ACTIVITY,
  FLAG_POS_NOTIFY_MENTION: FLAG_POS_NOTIFY_MENTION,
  FLAG_POS_NOTIFY_ANNOUNCEMENT: FLAG_POS_NOTIFY_ANNOUNCEMENT,

  getFlagsForMode: getFlagsForMode,
  getModeFromFlags: getModeFromFlags,
  getUpdateForMode: getUpdateForMode,
  getLurkForFlags: getLurkForFlags,
  getLurkForMode: getLurkForMode,
  toggleLegacyLurkMode: toggleLegacyLurkMode,

  hasNotifyUnread: hasNotifyUnread,
  hasNotifyActivity: hasNotifyActivity,
  hasNotifyMention: hasNotifyMention,
  hasNotifyAnnouncement: hasNotifyAnnouncement,
};
