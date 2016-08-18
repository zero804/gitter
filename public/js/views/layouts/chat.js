"use strict";

var Marionette = require('backbone.marionette');
var modalRegion = require('../../components/modal-region');
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
  dialogRegion: modalRegion,
  ui: {
    scroll: '#content-frame'
  },
  behaviors: {
    Isomorphic: {
      chat: {
        el: '#content-wrapper',
        init: 'initChatRegion'
      }
    }
  },

  initChatRegion: function(optionsForRegion) {
    var monitorUnreadItems = Marionette.getOption(this, "monitorUnreadItems");

    return new ChatContainerView(optionsForRegion({
      collection: this.options.chatCollection,
      decorators: [issueDecorator, commitDecorator, mentionDecorator, embedDecorator, emojiDecorator],
      monitorScrollPane: monitorUnreadItems && this.ui.scroll // Monitor the scroll region for unread items
    }));
  }

});

module.exports = ChatLayout;
