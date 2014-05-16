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
    var hash = params.hash;
    if(!hash) return "";

    var time = hash.time;
    if(!time) return "";

    var lang = hash.lang;
    var locale = hash.locale;

    time = moment(time);

    var duration = moment.duration(Date.now() - time.valueOf());

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
