/*jshint unused:true, browser:true*/
define([
  'jquery',
  './realtime',
  'utils/log'
], function($, realtime, log) {
  "use strict";

  var eyesOnState = true;

  function send(value) {
    if(!realtime._clientId) {
      return;
    }

    $.ajax({
      url: '/api/v1/eyeballs',
      data: {
        socketId: realtime._clientId,
        on: value
      },
      type: "POST",
      success: function(/*data*/) {
      }
    });
  }

  function eyeballsOff() {
    if(eyesOnState)  {
      log('eyeballsOff');

      eyesOnState = false;
      send(0);

      $(document).trigger('eyeballStateChange', false);
    }
  }

  function eyeballsOn() {
    if(!eyesOnState)  {
      log('eyeballsOn');

      eyesOnState = true;
      send(1);

      $(document).trigger('eyeballStateChange', true);
    }
  }

  log('Listening for focus events');

  $(window).on('blur', function() {
    log('blur');

    eyeballsOff();
  });

  $(window).on('focus', function() {
    log('focus');
    eyeballsOn();
  });

  $(window).on('pageshow', function() {
    log('pageshow');
    eyeballsOn();
  });

  $(window).on('pagehide', function() {
    log('pagehide');
    eyeballsOff();
  });


});