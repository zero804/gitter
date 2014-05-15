/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var moment = require('moment');
var maxDaysBeforeDateDisplay = 3;

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
    var lang = hash.lang;
    if(!time) return "";

    time = moment(time);

    var duration = moment.duration(Date.now() - time.valueOf());
    var v;
    if(duration.asDays() >= maxDaysBeforeDateDisplay) {
      v = time.format("LL", { lang: lang });
    } else {
      v = useLanguage(lang, function() {
        return duration.humanize() + " ago";
      });
    }

    return v;
  };
};
