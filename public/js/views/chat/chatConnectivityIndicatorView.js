'use strict';

var Backbone = require('backbone');
var Marionette = require('backbone.marionette');
var template = require('./tmpl/chatConnectivityIndicator.hbs');
var appEvents = require('utils/appevents');

module.exports = Marionette.ItemView.extend({

  template: template,
  className: 'chat-connectivity-indicator',

  ui: {
    indicator: '.chat-connectivity-indicator'
  },

  modelEvents: function() {
    var events = {
      'change': 'onConnectivityChange'
    };

    return events;
  },

  constructor: function() {
    this.model = new Backbone.Model({ hasConnectivity: true });
    // Call the super constructor
    Marionette.ItemView.prototype.constructor.apply(this, arguments);
  },

  initialize: function() {
    appEvents.on('realtime-connectivity:up', function(type, chat, options) {
      this.model.set('hasConnectivity', true);
    }.bind(this));
    appEvents.on('realtime-connectivity:down', function(type, chat, options) {
      this.model.set('hasConnectivity', false);
    }.bind(this));

    this.onConnectivityChange();
  },

  onConnectivityChange: function() {
    var hasConnectivity = this.model.get('hasConnectivity');
    this.$el.toggleClass('is-hidden', hasConnectivity)
  }
});
