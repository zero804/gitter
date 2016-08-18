"use strict";

var Marionette = require('backbone.marionette');
var modalRegion = require('../../components/modal-region');
var ChatContainerView = require('views/chat/chatContainerView');
var MobileLoginButton = require('views/mobile/mobileLoginButton');

/* Decorators */
var emojiDecorator = require('views/chat/decorators/emojiDecorator');
var mobileDecorator = require('views/chat/decorators/mobileDecorator');

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

  initialize: function(options) {
    this.chatCollection = options.chatCollection;
    this.dialogRegion = modalRegion;
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
