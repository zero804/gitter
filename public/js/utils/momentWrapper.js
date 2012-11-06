define([
  'moment'
], function(moment) {
  /*jshint trailing:false */
  /*global require:true console:true setTimeout:true*/
  "use strict";

  moment.calendar = {
    lastDay : '[Yesterday at] LT',
    sameDay : '[Today at] LT',
    nextDay : '[Tomorrow at] LT',
    lastWeek : '[last] dddd [at] LT',
    nextWeek : 'dddd [at] LT',
    sameElse : 'LL'
  };
  
  return moment;
});
