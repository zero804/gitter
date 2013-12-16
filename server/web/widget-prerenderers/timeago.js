/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var moment = require('moment');
var maxDaysBeforeDateDisplay = 3;


module.exports = exports = function() {
  return function timeagoWidgetHandler(params) {
    var hash = params.hash;
    if(!hash) return "";

    var time = hash.time;
    if(!time) return "";

    time = moment(time);

    var duration = moment.duration(Date.now() - time.valueOf());
    var v;
    if(duration.asDays() >= maxDaysBeforeDateDisplay) {
      v = time.format("LL");
    } else {
      v = duration.humanize() + " ago";
    }

    return v;
  };
};
