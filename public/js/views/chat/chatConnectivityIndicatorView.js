'use strict';

var Backbone = require('backbone');
var Marionette = require('backbone.marionette');
var template = require('./tmpl/chatConnectivityIndicator.hbs');
var appEvents = require('utils/appevents');

module.exports = Marionette.ItemView.extend({

  template: template,
  className: 'chat-connectivity-indicator',
  model: new Backbone.Model({ hasConnectivity: true }),
  ui: {
    indicator: '.chat-connectivity-indicator'
  },

  modelEvents: {
    'change': 'onConnectivityChange'
  },

  initialize: function() {
    this.listenTo(appEvents, 'realtime-connectivity:up', function() {
      this.model.set('hasConnectivity', true);
    });

    this.listenTo(appEvents, 'realtime-connectivity:down', function() {
      this.model.set('hasConnectivity', false);
    });
  },

  onRender: function() {
    this.onConnectivityChange();
  },

  onConnectivityChange: function() {
    var hasConnectivity = this.model.get('hasConnectivity');
    this.$el.toggleClass('is-hidden', hasConnectivity)
  }
});
