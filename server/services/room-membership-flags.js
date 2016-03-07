'use strict';

var StatusError = require('statuserror');

/* Note, these can not change! */
/* -----8<---- */
var FLAG_POS_NOTIFY_UNREAD       = 0;
var FLAG_POS_NOTIFY_ACTIVITY     = 1;
var FLAG_POS_NOTIFY_MENTION      = 2;
var FLAG_POS_NOTIFY_ANNOUNCEMENT = 3;
/* -----8<---- */

var BITMASK_INVERT = 0x0FFFFFFF;
var BITMASK_MODE = 1 << FLAG_POS_NOTIFY_UNREAD |
                   1 << FLAG_POS_NOTIFY_ACTIVITY |
                   1 << FLAG_POS_NOTIFY_MENTION |
                   1 << FLAG_POS_NOTIFY_ANNOUNCEMENT;

var BITMASK_INVERT_MODE = BITMASK_INVERT & ~BITMASK_MODE;

var BITMASK_NOTIFY_UNREAD       = 1 << FLAG_POS_NOTIFY_UNREAD;
var BITMASK_NO_NOTIFY_UNREAD    = BITMASK_INVERT & ~BITMASK_NOTIFY_UNREAD;
var BITMASK_NOTIFY_ACTIVITY     = 1 << FLAG_POS_NOTIFY_ACTIVITY;
var BITMASK_NOTIFY_MENTIONS     = 1 << FLAG_POS_NOTIFY_MENTION;
var BITMASK_NOTIFY_ANNOUNCEMENT = 1 << FLAG_POS_NOTIFY_ANNOUNCEMENT;

var MODES = {
  /* Mode: all: unread + no activity + mentions + announcements */
  all: BITMASK_NOTIFY_UNREAD | BITMASK_NOTIFY_MENTIONS | BITMASK_NOTIFY_ANNOUNCEMENT,

  /* Mode: announcement: no unread + activity + mentions + announcements */
  announcement: BITMASK_NOTIFY_ACTIVITY | BITMASK_NOTIFY_MENTIONS | BITMASK_NOTIFY_ANNOUNCEMENT,

  /* Mode: mute: no unread + no activity + mentions + no announcements */
  mute: BITMASK_NOTIFY_MENTIONS,
};

/* Alias modes */
MODES.mention = MODES.announcement;


function getModeFromFlags(flags) {
  switch(flags & BITMASK_MODE) {
    case MODES.all:
      return 'all';
    case MODES.announcement:
      return 'mention'; // TODO: rename this to announcement
    case MODES.mute:
      return 'mute';
  }

  // TODO: deal with 'unknown' modes better
  return null;
}

function getUpdateForMode(mode) {
  if (!MODES.hasOwnProperty(mode)) {
    throw new StatusError(400, 'Invalid mode ' + mode);
  }

  var setBits = MODES[mode];
  var clearBits = BITMASK_INVERT_MODE | setBits;

  var lurk = !(setBits & BITMASK_NOTIFY_UNREAD);

  return {
    $set: { lurk: lurk },
    $bit: { flags: { or: setBits, and: clearBits } }
  };
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

module.exports = {
  MODES: MODES,
  getModeFromFlags: getModeFromFlags,
  getUpdateForMode: getUpdateForMode,
  getLurkForFlags: getLurkForFlags,
  getLurkForMode: getLurkForMode
};
