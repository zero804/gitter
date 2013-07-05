/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  'log!dozy'
], function($, log) {
  "use strict";

  var TIMEOUT = 120000;
  var THRESHOLD = TIMEOUT * 1.5;

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