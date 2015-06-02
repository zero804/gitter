"use strict";

var Marionette = require('backbone.marionette');
var appEvents = require('utils/appevents');
var hasScrollBars = require('utils/scrollbar-detect');
var ChatCollectionView = require('views/chat/chatCollectionView');
var context = require('utils/context');
var unreadItemsClient = require('components/unread-items-client');

require('views/behaviors/isomorphic');

module.exports = Marionette.LayoutView.extend({
  behaviors: {
    Isomorphic: {
      chat: {
        el: '#chat-container',
        init: function(optionsForRegion) {
          var chatCollectionView = this.chatCollectionView = new ChatCollectionView(optionsForRegion({
            collection: this.collection,
            decorators: this.options.decorators
          }));

          if (this.options.monitorScrollPane) {
            this.collection.once('sync', function() {
              /* Why is this on sync only? */
              unreadItemsClient.monitorViewForUnreadItems(this.options.monitorScrollPane, chatCollectionView);
            }, this);
          }

          var c = context();
          if (c.permalinkChatId) {
            chatCollectionView.highlightPermalinkChat(c.permalinkChatId);
            delete c.permalinkChatId;
          }

          return chatCollectionView;
        }
      }
    }
  },

  ui: {
    primaryScroll: '.primary-scroll',
    scrollToBottom: '.js-scroll-to-bottom',
  },

  events: {
    'click @ui.scrollToBottom': appEvents.trigger.bind(appEvents, 'chatCollectionView:scrollToBottom')
  },

  collectionEvents: {
    atBottomChanged: function(isBottom) {
      this.ui.scrollToBottom.toggleClass('scrollHelper--hidden', isBottom);
    }
  },

  onRender: function() {
    if (hasScrollBars()) {
      this.ui.primaryScroll.addClass("scroller");
    }
  }
});
