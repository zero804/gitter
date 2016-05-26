"use strict";

var Marionette = require('backbone.marionette');
var behaviourLookup = require('./lookup');
var appEvents = require('../../utils/appevents');

var Behavior = Marionette.Behavior.extend({
  initialize: function() {
    var options = this.options;
    Object.keys(options).forEach(function(key) {
      var method = options[key];
      this.view.listenTo(appEvents, 'key', this.view[method]);
    });
  }
});

behaviourLookup.register('AppEvents', Behavior);

module.exports = Behavior;
