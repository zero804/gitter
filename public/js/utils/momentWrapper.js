/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
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
