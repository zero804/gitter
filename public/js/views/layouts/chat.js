'use strict';

var Marionette = require('backbone.marionette');
var context = require('../../utils/context');
var modalRegion = require('../../components/modal-region');
var ChatContainerView = require('../chat/chatContainerView');

/* Decorators */
var issuableDecorator = require('../chat/decorators/issuableDecorator');
var commitDecorator = require('../chat/decorators/commitDecorator');
var mentionDecorator = require('../chat/decorators/mentionDecorator');
var emojiDecorator = require('../chat/decorators/emojiDecorator');
require('../behaviors/isomorphic');

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
    var monitorUnreadItems = Marionette.getOption(this, 'monitorUnreadItems');

    const decorators = [issuableDecorator, commitDecorator, mentionDecorator, emojiDecorator];

    return new ChatContainerView(
      optionsForRegion({
        collection: this.options.chatCollection,
        decorators,
        monitorScrollPane: monitorUnreadItems && this.ui.scroll // Monitor the scroll region for unread items
      })
    );
  }
});

module.exports = ChatLayout;
