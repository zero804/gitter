define([
  'utils/appevents',
  'log!dozy'
], function(appEvents, log) {
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
      appEvents.trigger('reawaken', time);
    }

  }, TIMEOUT);

});
