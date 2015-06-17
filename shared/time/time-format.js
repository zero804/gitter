'use strict';

var moment = require('moment');
var ONE_DAY = 86400000;

/**
 * For now, this simply looks for dates older than one day,
 * but it should really switch over when the date has changed
 * (in your local timezone)
 */
function pastThrehold(date, now) {
  if (!now) now = Date.now();
  return (now - date) > ONE_DAY;
}

module.exports = function timeFormat(time, options) {
  var lang, tzOffset, compact, now;
  if (options) {
    lang = options.lang;
    tzOffset = options.tzOffset;
    compact = options.compact;
    now = options.now; // Makes testing easier
  }

  if (!time) return '';

  time = moment(time);
  if (lang) {
    time.locale(lang);
  }

  if (tzOffset !== undefined) {
    time.utcOffset(-tzOffset);
  }

  if (pastThrehold(time.valueOf(), now)) {
    return compact ? time.format("MMM DD") : time.format("MMM DD HH:mm");
  }

  return time.format("HH:mm");
};
