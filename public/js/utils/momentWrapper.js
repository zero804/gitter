/*jshint unused:strict, browser:true */
define([
  'moment'
], function(moment) {
  "use strict";

  moment.calendar = {
    lastDay : '[Yesterday at] LT',
    sameDay : '[Today at] LT',
    nextDay : '[Tomorrow at] LT',
    lastWeek : '[last] dddd [at] LT',
    nextWeek : 'dddd [at] LT',
    sameElse : 'LL'
  };

  moment.defaultFormat = 'YYYY-MM-DDTHH:mm:ss.SSSZ';

  return moment;
});
