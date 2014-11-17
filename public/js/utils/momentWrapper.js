"use strict";
var moment = require('moment');
var context = require('utils/context');

module.exports = (function() {


  moment.calendar = {
    lastDay : '[Yesterday at] LT',
    sameDay : '[Today at] LT',
    nextDay : '[Tomorrow at] LT',
    lastWeek : '[last] dddd [at] LT',
    nextWeek : 'dddd [at] LT',
    sameElse : 'LL'
  };

  moment.lang(context.lang());
  moment.defaultFormat = 'YYYY-MM-DDTHH:mm:ss.SSSZ';

  return moment;

})();

