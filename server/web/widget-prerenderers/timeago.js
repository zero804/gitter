/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var moment = require('moment');
var maxDaysBeforeDateDisplay = 1;

function useLanguage(language, callback) {
  if(!language) return callback();
  moment.lang(language);
  try {
    return callback();
  } finally {
    moment.lang('en-GB');
  }
}

module.exports = exports = function() {
  return function timeagoWidgetHandler(params) {
    var options = params.hash || {};

    var time    = options.time;
    var lang    = options.lang;
    var locale  = options.locale;

    if (!options || !time) return '';

    time = moment(time);

    var duration = moment.duration(Date.now() - time.valueOf());

    if (options.compact) {
      if (duration.asDays() >= maxDaysBeforeDateDisplay) {
        return time.format("MMM DD");
      } else {
        return time.format("H:mm");
      }
    }

    if(duration.asDays() >= maxDaysBeforeDateDisplay) {
      return time.format("LL", { lang: lang });
    }

    var v = useLanguage(lang, function() {
      return duration.humanize();
    });

    /* This should never happen... */
    if(!locale) return v + " ago";

    return locale.__("%s ago", v);
  };
};
