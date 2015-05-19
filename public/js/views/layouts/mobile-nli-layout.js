"use strict";

var Marionette = require('backbone.marionette');
var modalRegion = require('components/modal-region');
var ChatContainerView = require('views/chat/chatContainerView');
var MobileLoginButton = require('views/mobile/mobileLoginButton');

/* Decorators */
var emojiDecorator = require('views/chat/decorators/emojiDecorator');
var mobileDecorator = require('views/chat/decorators/mobileDecorator');
var chatInputView = require('views/chat/chatInputView');

require('jquery-hammerjs');

require('views/behaviors/isomorphic');

module.exports = Marionette.LayoutView.extend({
  template: false,
  el: 'body',

  behaviors: {
    Isomorphic: {
      chat: { el: '#content-wrapper', init: 'initChatRegion' },
      login: { el: '#login-footer', init: 'initLoginRegion' }
    }
  },

  ui: {
    // mainPage: '#mainPage',
    // showTroupesButton: '#showTroupesButton'
  },

  events: {
    // 'tap': 'tap',
    // 'touch @ui.showTroupesButton': 'stopClickEvents',
    // 'tap @ui.showTroupesButton': 'showHideTroupes'
  },

  initialize: function(options) {
    this.chatCollection = options.chatCollection;
    this.dialogRegion = modalRegion;
  },

  onRender: function() {
    this.$el.hammer();
  },

  initChatRegion: function(optionsForRegion) {
    return new ChatContainerView(optionsForRegion({
      collection: this.options.chatCollection,
      decorators: [emojiDecorator, mobileDecorator]
    }));
  },

  initLoginRegion: function(optionsForRegion) {
    return new MobileLoginButton(optionsForRegion());
  },


});
