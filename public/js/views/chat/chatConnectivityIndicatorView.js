var Marionette = require('backbone.marionette');
var template = require('./tmpl/chatConnectivityIndicator.hbs');
var appEvents = require('utils/appevents');

module.exports = Marionette.ItemView.extend({

  template: template,

  ui: {
    indicator: '.chat-connectivity-indicator'
  },

  events: {
    //'click button.main': 'onMainButtonClick'
  },

  modelEvents: function() {
    var events = {};
    events['change:unread' + this.position]      = 'updateVisibility';

    return events;
  },

  init: function() {

    appEvents.on('permalink.requested', function(type, chat, options) {

    });
  },

  serializeData: function() {
  }
});
