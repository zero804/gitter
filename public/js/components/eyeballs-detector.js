"use strict";

var _ = require('underscore');
var Backbone = require('backbone');
var debug = require('debug-proxy')('app:eyeballs:detector');
var pageVisibility = require('../utils/page-visibility');
var passiveEventListener = require('../utils/passive-event-listener');
var rafUtils = require('../utils/raf-utils');
var onReady = require('../utils/onready');

var events = {};
_.extend(events, Backbone.Events);

var eyesOnState = true;
var INACTIVITY = 60 * 1000; /* One minute */
var INACTIVITY_POLL = 10 * 1000; /* 10 seconds */

function eyeballsOff() {
  if(eyesOnState) {
    stopInactivityPoller();
    debug('Eyeballs off');
    eyesOnState = false;

    events.trigger('change', false);
  }
}

function eyeballsOn() {
  lastUserInteraction = Date.now();
  inactivity = false;

  if(!eyesOnState) {
    startInactivityPoller();

    debug('Eyeballs on');
    eyesOnState = true;

    events.trigger('change', true);
  }
}

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

pageVisibility.events.on('change', function() {
  if (pageVisibility.isHidden()) {
    eyeballsOff();
  } else {
    eyeballsOn();
  }
});

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

var debouncedInteractionTracking = _.debounce(updateLastUserInteraction, 500);

passiveEventListener.addEventListener(document, 'keydown', debouncedInteractionTracking);
passiveEventListener.addEventListener(document, 'mousemove', debouncedInteractionTracking);
passiveEventListener.addEventListener(document, 'touchstart', debouncedInteractionTracking);
passiveEventListener.addEventListener(window, 'scroll', debouncedInteractionTracking);

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

function getEyeballs() {
  return eyesOnState;
}

function forceEyeballs(state) {
  if (state) {
    eyeballsOn();
  } else {
    eyeballsOff();
  }
}

var focusFrames = [document.hasFocus()];
var evaluateFocusBlur = rafUtils.debounce(function() {
  var hasFocus = focusFrames.some(function(x) {
    return x;
  });

  if (hasFocus) {
    eyeballsOn();
  } else {
    eyeballsOff();
  }
});


/* Focus and blur */
function makeFocusHandler(index) {
  return function() {
    focusFrames[index] = true;
    evaluateFocusBlur();
  }
}

function makeBlurHandler(index) {
  return function() {
    focusFrames[index] = false;
    evaluateFocusBlur();
  }
}

// Add listeners to the base window
passiveEventListener.addEventListener(window, 'focus', makeFocusHandler(0));
passiveEventListener.addEventListener(window, 'blur', makeBlurHandler(0));

function monitorIFrame(frame, index) {
  var contentWindow = frame.contentWindow;
  var focused = contentWindow.document.hasFocus();
  focusFrames.push(focused);

  var focusHandler = makeFocusHandler(index);
  var blurHandler = makeBlurHandler(index);

  passiveEventListener.addEventListener(contentWindow, 'focus', focusHandler);
  passiveEventListener.addEventListener(contentWindow, 'blur', blurHandler);

  function unloadHandler() {
    // Stop listening during the iframe load
    if (!contentWindow) return;
    passiveEventListener.removeEventListener(contentWindow, 'focus', focusHandler);
    passiveEventListener.removeEventListener(contentWindow, 'blur', blurHandler);
    passiveEventListener.removeEventListener(contentWindow, 'unload', unloadHandler);
    contentWindow = null;
  }

  passiveEventListener.addEventListener(contentWindow, 'unload', unloadHandler);

  passiveEventListener.addEventListener(frame, 'load', function() {
    // Start listening after the iframe load
    if (contentWindow === frame.contentWindow) return;
    contentWindow = frame.contentWindow;
    passiveEventListener.addEventListener(contentWindow, 'focus', focusHandler);
    passiveEventListener.addEventListener(contentWindow, 'blur', blurHandler);
    passiveEventListener.addEventListener(contentWindow, 'unload', unloadHandler);

    var focused = contentWindow.document.hasFocus();
    focusFrames[index] = focused;
    evaluateFocusBlur();
  });

}

onReady(function() {
  // Find all iframes and monitor them
  var frames = document.querySelectorAll('iframe');
  for (var i = 0; i < frames.length; i++) {
    var frame = frames[i];
    var index = i + 1;
    monitorIFrame(frame, index);
  }
})

module.exports = {
  getEyeballs: getEyeballs,
  forceEyeballs: forceEyeballs,
  events: events
}
