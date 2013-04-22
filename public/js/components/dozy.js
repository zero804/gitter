/*jshint unused:true, browser:true*/
define([
  'jquery',
  'log!dozy'
], function($, log) {
  "use strict";

  // 10 second timeout, 20 seconds to respond
  var TIMEOUT = 10000;
  var THRESHOLD = TIMEOUT * 2;

  var last = Date.now();
  window.setInterval(function() {
    var now = Date.now();

    var time = now - last;
    var sleepDetected = time > THRESHOLD;
    last = now;

    if(sleepDetected) {
      log('Sleep detected!');
      $(document).trigger('reawaken', time);
    }

  }, TIMEOUT);

});