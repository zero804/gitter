"use strict";
var appEvents = require('utils/appevents');
var log = require('utils/log');

module.exports = (function() {


  var TIMEOUT = 120000;
  var THRESHOLD = TIMEOUT * 1.5;

  var last = Date.now();
  window.setInterval(function() {
    var now = Date.now();

    var time = now - last;
    var sleepDetected = time > THRESHOLD;
    last = now;

    if(sleepDetected) {
      log.info('Sleep detected!');
      appEvents.trigger('reawaken', time);
    }

  }, TIMEOUT);


})();

