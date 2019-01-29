'use strict';

var moment = require('moment');

/**
 * Returns an abbreviated time format.
 *
 * * If the date is today, returns the time
 * * If the date is this year, returns the full date without a year
 * * Otherwise returns the full
 */
module.exports = function timeFormat(time, options) {
  if (!time) return '';

  var lang, tzOffset, compact, now;
  if (options) {
    lang = options.lang;
    tzOffset = options.tzOffset;
    compact = options.compact;
    now = options.now; // Makes testing easier
  }

  time = moment(time);
  if (lang) {
    time.locale(lang === 'en' ? 'en-gb' : lang);
  }

  if (tzOffset !== undefined) {
    time.utcOffset(-tzOffset);
  }

  var today = moment(now).utcOffset(time.utcOffset());

  if (
    time.date() === today.date() &&
    time.month() === today.month() &&
    time.year() === today.year()
  ) {
    // TODO: deal with american `10:20 PM`
    return time.format('HH:mm');
  }

  if (time.year() === today.year()) {
    return time.format(compact ? 'MMM DD' : 'MMM DD HH:mm');
  }

  return time.format(compact ? 'MMM DD YYYY' : 'MMM DD YYYY HH:mm');
};
