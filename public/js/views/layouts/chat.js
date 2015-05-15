"use strict";

var Marionette = require('backbone.marionette');
var modalRegion = require('components/modal-region');
var ChatContainerView = require('views/chat/chatContainerView');

/* Decorators */
var issueDecorator = require('views/chat/decorators/issueDecorator');
var commitDecorator = require('views/chat/decorators/commitDecorator');
var mentionDecorator = require('views/chat/decorators/mentionDecorator');
var embedDecorator = require('views/chat/decorators/embedDecorator');
var emojiDecorator = require('views/chat/decorators/emojiDecorator');
require('views/behaviors/isomorphic');

var ChatLayout = Marionette.LayoutView.extend({
  template: false,
  el: 'body',

  behaviors: {
    Isomorphic: {}
  },

  regions: {
    chat: '#content-wrapper',
  },

  initialize: function(options) {
    this.chatCollection = options.chatCollection;
    this.dialogRegion = modalRegion;
  },

  initChatRegion: function(optionsForRegion) {
    return new ChatContainerView(optionsForRegion('chat', {
      collection: this.chatCollection,
      decorators: [issueDecorator, commitDecorator, mentionDecorator, embedDecorator, emojiDecorator]
    }));
  }

});

module.exports = ChatLayout;
