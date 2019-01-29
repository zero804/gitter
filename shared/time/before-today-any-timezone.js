'use strict';

var moment = require('moment');

module.exports = function beforeTodayAnyTimezone(endDate) {
  var startOfTodayUTC = moment.utc().startOf('day');
  var worstCaseStartUTC = startOfTodayUTC.subtract(12, 'hours');
  return endDate < worstCaseStartUTC;
};
