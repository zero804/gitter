define([
  'jquery',
  'utils/context',
  './realtime',
  'log!eyeballs',
  'utils/appevents'
], function($, context, realtime, log, appEvents) {
  "use strict";

  var eyesOnState = true;
  var INACTIVITY = 60 * 1000;
  var INACTIVITY_POLL = 10 * 1000;
  var PING_POLL = 10 * 60 * 1000;

  function send(value, synchronous) {
    if(!realtime.getClientId()) {
      return;
    }

    if(!context.getTroupeId()) {
      return;
    }

    var clientId = realtime.getClientId();
    $.ajax({
      url: '/api/v1/eyeballs',
      data: {
        socketId: clientId,
        on: value
      },
      dataType: 'text',
      async: !synchronous,
      global: false,
      type: "POST",
      error: function(xhr) {
        if(xhr.status !== 400) {
          log('An error occurred while communicating eyeballs');
        } else {
          // The connection is gone...
          log('Eyeballs returned 400. Realtime connection may be dead.');
          appEvents.trigger('eyeballsInvalid', clientId);
        }
      }
    });
  }

  function eyeballsOff(synchronous) {
    if(eyesOnState)  {
      stopInactivityPoller();

      eyesOnState = false;
      send(0, synchronous);

      appEvents.trigger('eyeballStateChange', false);
    }
  }

  function eyeballsOn() {
    lastUserInteraction = Date.now();
    inactivity = false;

    if(!eyesOnState)  {
      startInactivityPoller();

      eyesOnState = true;
      send(1);

      appEvents.trigger('eyeballStateChange', true);
    }
  }

  window.addEventListener('blur', function() {
    eyeballsOff();
  }, false);

  window.addEventListener('focus', function() {
    eyeballsOn();
  }, false);

  var cordova = window.cordova;

  if(cordova) {
    document.addEventListener("deviceready", function() {

      appEvents.on('realtime:newConnectionEstablished', registerSocket);
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
        // log('resume: eyeballs set to ' + eyesOnState);

        updateLastUserInteraction();
        window.setTimeout(function() {
          eyeballsOn();
        }, 0);
      }, false);

      // Cordova specific events
      document.addEventListener("pause", function() {
        eyesOnState = false;
        // log('pause');

      }, false);

    }, false);



  } else {
    // Use this technique only as a failover if the cordova plugin isn't available
    // Unfortunately it's not too good as Safari cuts the request off before it
    // goes back to the server

    window.addEventListener('pageshow', function() {
      updateLastUserInteraction();
      eyeballsOn();
    }, false);

    window.addEventListener('pagehide', function() {
      // log('pagehide');
      eyeballsOff();
    }, false);

  }

  var lastUserInteraction = Date.now();
  var inactivity = false;
  var interactionUpdateTimer;
  function updateLastUserInteraction() {

    if(inactivity) {
      // Inactivity has ended.....
      eyeballsOn();
    }

    if(!interactionUpdateTimer) {
      interactionUpdateTimer = setTimeout(function() {
        interactionUpdateTimer = null;
        lastUserInteraction = Date.now();
      }, 100);
    }
  }

  function onBeforeUnload() {
    eyeballsOff(true);
  }

  // $(document).on('keydown', updateLastUserInteraction);
  // $(document).on('mousemove', updateLastUserInteraction);
  // $(window).on('scroll', updateLastUserInteraction);

  document.addEventListener("keydown", updateLastUserInteraction, false);
  document.addEventListener("mousemove", updateLastUserInteraction, false);
  window.addEventListener("scroll", updateLastUserInteraction, false);

  window.addEventListener("beforeunload", onBeforeUnload, false);

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

  // We use this to ensure that the users session does not time out
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

  return {
    getEyeBalls: function() {
      return eyesOnState;
    }
  };
});
