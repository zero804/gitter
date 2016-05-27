"use strict";

var context = require('utils/context');
var apiClient = require('components/apiClient');
var localStore = require('./local-store');
var realtime = require('./realtime');
var realtimePresenceTracking = require('./realtime-presence-tracking');
var appEvents = require('utils/appevents');
var _ = require('underscore');
var debug = require('debug-proxy')('app:eyeballs');

// Tell realtime signals to report on presence
realtimePresenceTracking.track();

module.exports = (function() {

  var eyesOnState = true;
  var INACTIVITY = 60 * 1000;
  var INACTIVITY_POLL = 10 * 1000;

  function send(value, synchronous) {
    if (localStore.get('gitterNoEyeballSignals')) return;

    if(!realtime.getClientId()) {
      return;
    }

    if(!context.getTroupeId()) {
      return;
    }

    var clientId = realtime.getClientId();
    apiClient.post('/v1/eyeballs', {
        socketId: clientId,
        on: value
      }, {
        dataType: 'text',
        async: !synchronous,
        global: false
      })
      .catch(function(err) {
        if(err.status === 400) {
          // The connection is gone...
          debug('Eyeballs returned 400. Realtime connection may be dead.');
          appEvents.trigger('eyeballsInvalid', clientId)
        } else {
          debug('An error occurred while communicating eyeballs');
        }
      });
  }

  function eyeballsOff(synchronous) {
    if(eyesOnState) {
      stopInactivityPoller();

      debug('Eyeballs off');
      eyesOnState = false;
      send(0, synchronous);

      appEvents.trigger('eyeballStateChange', false);
    }
  }

  function eyeballsOn() {
    lastUserInteraction = Date.now();
    inactivity = false;

    if(!eyesOnState) {
      startInactivityPoller();

      debug('Eyeballs on');
      eyesOnState = true;
      send(1);

      appEvents.trigger('eyeballStateChange', true);
    }
  }

  appEvents.on('change:room', function() {
    eyeballsOn();
  });

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
        updateLastUserInteraction();
        window.setTimeout(function() {
          eyeballsOn();
        }, 0);
      }, false);

      // Cordova specific events
      document.addEventListener("pause", function() {
        eyesOnState = false;
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

  // function onBeforeUnload() {
  //   eyeballsOff(true);
  // }
  // window.addEventListener("beforeunload", onBeforeUnload, false);

  // $(document).on('keydown', updateLastUserInteraction);
  // $(document).on('mousemove', updateLastUserInteraction);
  // $(window).on('scroll', updateLastUserInteraction);

  var debouncedInteractionTracking = _.debounce(updateLastUserInteraction, 500);

  document.addEventListener("keydown", debouncedInteractionTracking, false);
  document.addEventListener("mousemove", debouncedInteractionTracking, false);
  document.addEventListener("touchstart", debouncedInteractionTracking, false);
  window.addEventListener("scroll", debouncedInteractionTracking, false);


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
          debug('inactivity');
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

  return {
    getEyeBalls: function() {
      return eyesOnState;
    }
  };

})();
