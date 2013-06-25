/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  './realtime',
  'log!eyeballs'
], function($, realtime, log) {
  "use strict";

  var eyesOnState = true;
  var INACTIVITY = 60 * 1000;
  var INACTIVITY_POLL = 10 * 1000;
  var PING_POLL = 10 * 60 * 1000;

  function send(value, synchronous) {
    if(!realtime.getClientId()) {
      return;
    }

    $.ajax({
      url: '/api/v1/eyeballs',
      data: {
        socketId: realtime.getClientId(),
        on: value
      },
      async: !synchronous,
      global: false,
      type: "POST",
      success: function(/*data*/) {
      },
      statusCode: {
        400: function() {
          // The connection is gone...
          log('Eyeballs returned 400. Recycling realtime connection.');
          realtime.recycleConnection();
        }
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
      send(0, true);

      $(document).trigger('eyeballStateChange', false);
    }
  }

  function eyeballsOn() {
    lastUserInteraction = Date.now();
    inactivity = false;

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

  var cordova = window.cordova;

  if(cordova) {
    document.addEventListener("deviceready", function() {

      $(document).on('realtime:newConnectionEstablished', registerSocket);
      registerSocket();

      function registerSocket() {
        window.setTimeout(function() {
          var socketId = realtime.getClientId();
          if(socketId) {
            cordova.exec(function() {}, function() {}, "EyeballsOff",
                     "registerSocket", [socketId]);
          }
        }, 0);
      }

      document.addEventListener("resume", function() {
        log('resume: eyeballs set to ' + eyesOnState);

        updateLastUserInteraction();
        window.setTimeout(function() {
          eyeballsOn();
        }, 0);
      }, false);

      // Cordova specific events
      document.addEventListener("pause", function() {
        eyesOnState = false;
        log('pause');

      }, false);

    }, false);



  } else {
    // Use this technique only as a failover if the cordova plugin isn't available
    // Unfortunately it's not too good as Safari cuts the request off before it
    // goes back to the server
    $(window).on('pageshow', function() {
      log('pageshow');
      updateLastUserInteraction();

      eyeballsOn();
    });

    $(window).on('pagehide', function() {
      log('pagehide');
      eyeballsOff();
    });

  }

  var lastUserInteraction = Date.now();
  var inactivity = false;

  function updateLastUserInteraction() {
    lastUserInteraction = Date.now();

    if(inactivity) {
      // Inactivity has ended.....
      eyeballsOn();
    }
  }

  $(document).on('keydown', updateLastUserInteraction);
  $(window).on('scroll', updateLastUserInteraction);
  $(document).on('mousemove', updateLastUserInteraction);


  startInactivityPoller();

  var inactivityTimer;
  function startInactivityPoller() {
    if(inactivityTimer) return;

    inactivityTimer = window.setInterval(function() {

      // This is a long timeout, so it could possibly be delayed by
      // the user pausing the application. Therefore just wait for one
      // more period for activity to start again...

      window.setTimeout(function() {
        if(Date.now() - lastUserInteraction > (INACTIVITY - INACTIVITY_POLL)) {
          log('inactivity');
          inactivity = true;
          stopInactivityPoller();
          eyeballsOff();
        }
      }, 5);

    }, INACTIVITY_POLL);
  }

  function stopInactivityPoller() {
    if(!inactivityTimer) return;
    window.clearTimeout(inactivityTimer);
    inactivityTimer = null;
  }

  window.setInterval(function() {
    $.ajax({
      url: '/api/v1/ping',
      global: false,
      type: "GET",
      success: function(/*data*/) {
      },
      error: function() {
        log('An error occurred while communicating eyeballs');
      }
    });
  }, PING_POLL);


});