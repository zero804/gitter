"use strict";

var Marionette = require('backbone.marionette');
var behaviourLookup = require('./lookup');
var timeFormat = require('gitter-web-shared/time/time-format');

/**
 * If the supplied time is 'today' from the persepective of the
 * user's local timezone, returns the number of milliseconds until
 * midnight in the user's local timezone.
 *
 * For example:
 *   At midnight, will return 86400k
 *   At noon, will return 43200k
 *   At 11pm, will return 3600k
 *   At 11:59:59.000, will return 1k
 *
 * Currently, does not handle daylight savings changeover days.
 */
function timeRemainingTodayLocalTZ(time) {
  if (!time) return;

  var now = new Date();
  var msIntoDay;

  if (time instanceof Date) {
    if (time.getDate() === now.getDate() &&
        time.getMonth() === now.getMonth() &&
        time.getFullYear() === now.getFullYear()) {
      msIntoDay = time.getHours() * 3600000 /* ms in hour */ +
                      time.getMinutes() * 60000 /* ms in minute */ +
                      time.getSeconds() * 1000  /* ms in second */ +
                      time.getMilliseconds();

      return 86400000 - msIntoDay;
    }
  }

  // Deal with moment dates
  if (time.date) {
    if (time.date() === now.getDate() &&
        time.month() === now.getMonth() &&
        time.year() === now.getFullYear()) {

      msIntoDay = time.hour() * 3600000 /* ms in hour */ +
                      time.minute() * 60000 /* ms in minute */ +
                      time.second() * 1000  /* ms in second */ +
                      time.millisecond();

      return 86400000 - msIntoDay;
    }
  }

  return 0;
}

var Behavior = Marionette.Behavior.extend({
  defaults: {
    modelAttribute: null,
    el: null
  },

  ui: function() {
    return {
      'time': this.options.el
    };
  },

  modelEvents: function() {
    var result = {};
    result['change:' + this.options.modelAttribute] = 'onTimeChange';
    return result;
  },

  initialize: function() {
    this.timer = null;
  },

  onTimeChange: function(model) {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    var time = model.get(this.options.modelAttribute);

    var timeRemaining = timeRemainingTodayLocalTZ(time);
    if (timeRemaining > 0) {
      // Add one millisecond onto the time to make sure that it's definitely
      // into the new day
      this.timer = setTimeout(this.onTimeChange.bind(this, model), timeRemaining + 1);
    }

    this.renderTime(time);
  },

  renderTime: function(time) {
    var text = timeFormat(time, { compact: this.options.compact });
    this.ui.time[0].textContent = text;
  },

  onDestroy: function() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
});

behaviourLookup.register('TimeAgo', Behavior);
module.exports = Behavior;
