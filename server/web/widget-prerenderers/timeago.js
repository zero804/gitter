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
    return '';

    // FIXME Temporarily disable until we find a nice
    // way to render user's timezone server-side

    //var options = params.hash || {};

    //var time    = options.time;
    //var lang    = options.lang;
    //var locale  = options.locale;

    //if (!options || !time) return '';

    //time = moment(time);

    //var messageAge = moment.duration(Date.now() - time.valueOf());

    //if (messageAge.asDays() >= maxDaysBeforeDateDisplay) {
    //  return options.compact ? time.format("MMM DD") : time.format("MMM DD H:mm");
    //} else {
    //  return time.format("H:mm");
    //}

    //var v = useLanguage(lang, function() {
    //  return messageAge.humanize();
    //});

    ///* This should never happen... */
    //if(!locale) return v + " ago";

    //return locale.__("%s ago", v);
  };
};
