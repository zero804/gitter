'use strict';

// Keeps track of the unload time so we can kinda detect if a refresh happened.
// We use this information with the left-menu state rehrydration
var unloadTracker = function() {
  var timeAtUnload = new Date().getTime();
  document.cookie = 'previousUnloadTime=' + timeAtUnload + '; path=/';
};

var alreadyListening = false;
unloadTracker.startListening = function() {
  if(!alreadyListening) {
    window.onbeforeunload = unloadTracker;
    alreadyListening = true;
  }
};

module.exports = unloadTracker;
