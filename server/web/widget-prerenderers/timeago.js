/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var timeFormat = require('../../../shared/time/time-format');

module.exports = exports = function() {
  return function timeagoWidgetHandler(params) {
    var options = params.hash || {};

    var time    = options.time;
    var lang    = options.lang;

    return timeFormat(time, { lang: lang, tzOffset: params.data.root.tzOffset, compact: options.compact });
  };
};
