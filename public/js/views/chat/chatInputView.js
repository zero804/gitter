"use strict";
var Backbone = require('backbone');
var Marionette = require('backbone.marionette');
var context = require('utils/context');
var template = require('./tmpl/chatInputView.hbs');
var cocktail = require('cocktail');
var KeyboardEventsMixin = require('views/keyboard-events-mixin');
var ChatInputBoxView = require('./chat-input-box-view');
var ChatInputButtons = require('./chat-input-buttons');

module.exports = (function() {

  setTimeout(function() {
    window.localStorage.removeItem('compose_mode_enabled');
  }, 0);

  var ComposeMode = Backbone.Model.extend({
    defaults: {
      isComposeModeEnabled: false,
    }
  });

  var ChatInputView = Marionette.LayoutView.extend({

    template: template,

    behaviors: {
      Widgets: {}
    },

    regions: {
      chatInputBox: '#chat-input-box-region',
      chatInputButtons: '#chat-input-buttons-region'
    },

    keyboardEvents: {
      'chat.toggle': 'toggleComposeMode'
    },

    initialize: function() {
      this.composeMode = new ComposeMode();
    },

    serializeData: function() {
      return { user: context.user() };
    },

    onRender: function() {
      this.getRegion('chatInputBox').show(new ChatInputBoxView({
        composeMode: this.composeMode,
        collection: this.collection
      }));
      this.getRegion('chatInputButtons').show(new ChatInputButtons({
        model: this.composeMode
      }));
    }

  });

  cocktail.mixin(ChatInputView, KeyboardEventsMixin);

  return ChatInputView;

})();
