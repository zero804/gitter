"use strict";

var context = require('utils/context');
var appEvents = require('utils/appevents');

var eyeballState = true;
var track = false;

module.exports = {
  track: function() {
    if (track) return;
    track = true;

    appEvents.on('eyeballStateChange', function (state) {
      eyeballState = state;
    });
  },

  getAuthDetails: function() {
    if (!track) return {};

    return {
      troupeId: context.getTroupeId(),
      eyeballs: eyeballState ? 1 : 0
    };
  },

  getEyeballs: function() {
    return (track && eyeballState) ? 1 : 0;
  }
};
