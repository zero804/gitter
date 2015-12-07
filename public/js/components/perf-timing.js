'use strict';

var appEvents = require('../utils/appevents');

var timers = {};

module.exports = {
  start: function(name) {
    timers[name] = Date.now();
  },

  end: function(name) {
    var value = timers[name];
    delete timers[name];

    if (!value) return;
    appEvents.trigger('stats.time', name, Date.now() - value);

    return value;
  }
};
