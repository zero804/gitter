var Marionette = require('backbone.marionette');
var template = require('./tmpl/chatConnectivityIndicator.hbs');
var appEvents = require('utils/appevents');

module.exports = Marionette.ItemView.extend({

  hasConnectivityIssues: false,

  template: template,

  ui: {
    indicator: '.chat-connectivity-indicator'
  },

  events: {
    //'click button.main': 'onMainButtonClick'
  },

  modelEvents: function() {
    var events = {
      'change': 'render'
    };


    return events;
  },

  initialize: function() {
    console.log('chat-connectivity-indicator init');

    appEvents.on('realtime-connectivity:up', function(type, chat, options) {
      this.hasConnectivityIssues = false;
    });
    appEvents.on('realtime-connectivity:down', function(type, chat, options) {
      this.hasConnectivityIssues = true;
    });

    window.triggerConnectivity = function(isConnected) {
      appEvents.trigger('realtime-connectivity:' + (isConnected ? 'up' : 'down'));
    };
  },

  serializeData: function() {
    var data = {
      hasConnectivityIssues: this.hasConnectivityIssues
    };

    return data;
  },

  render: function() {


  }
});
