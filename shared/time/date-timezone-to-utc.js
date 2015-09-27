'use strict';

var moment = require('moment');

module.exports = function dateTimezoneToUTC(year, month, day, tzOffset) {
  var time = moment();

  if (tzOffset !== undefined) {
    //
    // NOTE: Unlike moment.fn.zone this function returns the real offset from UTC,
    // not the reverse offset (as returned by Date.prototype.getTimezoneOffset).
    //
    time.utcOffset(-tzOffset);
  } else {
    time.utcOffset(0);
  }

  time.set('year', year);
  time.set('month', month - 1); // Oh moment, why?
  time.set('date', day);

  time.set('hours', 0);
  time.set('minutes', 0);
  time.set('seconds', 0);
  time.set('milliseconds', 0);

  return time.toDate();
};
