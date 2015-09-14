"use strict";
var Backbone = require('backbone');
var Marionette = require('backbone.marionette');
var context = require('utils/context');
var template = require('./tmpl/chatInputView.hbs');
var ChatInputBoxView = require('./chat-input-box-view');
var ChatInputButtons = require('./chat-input-buttons');
var isMobile = require('utils/is-mobile');

require('views/behaviors/isomorphic');

module.exports = (function() {

  // clean up old compose mode persistance in the next event loop.
  setTimeout(function() {
    window.localStorage.removeItem('compose_mode_enabled');
  }, 0);

  var ChatInputView = Marionette.LayoutView.extend({

    template: template,

    behaviors: {
      Widgets: {},
      Isomorphic: {
        chatInputBox: { el: '#chat-input-box-region', init: 'initChatInputBoxRegion' },
        chatInputButtons: { el: '#chat-input-buttons-region', init: 'initChatInputButtonsRegion' }
      }
    },

    regions: {
      chatInputBox: '#chat-input-box-region',
      chatInputButtons: '#chat-input-buttons-region'
    },

    initialize: function() {
      this.composeMode = new Backbone.Model({ isComposeModeEnabled: isMobile() });
    },

    serializeData: function() {
      return { user: context.user() };
    },

    initChatInputBoxRegion: function(optionsForRegion) {
      return new ChatInputBoxView(optionsForRegion({
        composeMode: this.composeMode,
        collection: this.collection
      }));
    },

    initChatInputButtonsRegion: function(optionsForRegion) {
      return new ChatInputButtons(optionsForRegion({
        model: this.composeMode
      }));
    }

  });

  return ChatInputView;

})();
