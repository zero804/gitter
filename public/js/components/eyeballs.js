/*jshint unused:true, browser:true*/
define([
  'jquery',
  './realtime',
  'log!eyeballs'
], function($, realtime, log) {
  "use strict";

  var eyesOnState = true;
  var INACTIVITY = 60 * 1000;
  var INACTIVITY_POLL = 10 * 1000;

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
      global: false,
      type: "POST",
      success: function(/*data*/) {
      },
      error: function() {
        log('An error occurred while communicating eyeballs');
      }
    });
  }

  function eyeballsOff() {
    if(eyesOnState)  {
      log('eyeballsOff');
      stopInactivityPoller();

      eyesOnState = false;
      send(0);

      $(document).trigger('eyeballStateChange', false);
    }
  }

  function eyeballsOn() {
    updateLastUserInteraction();

    if(!eyesOnState)  {
      log('eyeballsOn');
      startInactivityPoller();

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

  var lastUserInteraction = Date.now();
  function updateLastUserInteraction() {
    lastUserInteraction = Date.now();
  }

  $(document).on('keydown', updateLastUserInteraction);
  $(window).on('scroll', updateLastUserInteraction);
  $(document).on('mousemove', updateLastUserInteraction);

  startInactivityPoller();

  var inactivityTimer;
  function startInactivityPoller() {
    if(inactivityTimer) return;

    inactivityTimer = window.setInterval(function() {
      if(Date.now() - lastUserInteraction > (INACTIVITY - INACTIVITY_POLL)) {
        log('inactivity');
        stopInactivityPoller();
        eyeballsOff();
      }
    }, INACTIVITY_POLL);
  }

  function stopInactivityPoller() {
    if(!inactivityTimer) return;
    window.clearTimeout(inactivityTimer);
    inactivityTimer = null;
  }



});