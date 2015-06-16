'use strict';

var moment = require('moment');
var ONE_DAY = 86400 * 1000;

function pastThrehold(date) {
  return Date.now() - date > ONE_DAY;
}

module.exports = function timeFormat(time, options) {
  var lang, tzOffset, compact;
  if (options) {
    lang = options.lang;
    tzOffset = options.tzOffset;
    compact = options.compact;
  }

  if (!time) return '';

  time = moment(time);
  if (lang) {
    time.locale(lang);
  }

  if (tzOffset) {
    time.utcOffset(-tzOffset);
  }

  if (pastThrehold(time.valueOf())) {
    return compact ? time.format("MMM DD") : time.format("MMM DD HH:mm");
  }

  return time.format("HH:mm");
};
