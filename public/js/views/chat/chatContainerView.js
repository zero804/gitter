/* global document */
"use strict";

var Marionette = require('backbone.marionette');
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

            //only check the items on init if the window is focused
            if(document.hasFocus()){
              unreadItemsClient.monitorViewForUnreadItems(this.options.monitorScrollPane, chatCollectionView);
            }

            this.collection.once('sync', function() {
              unreadItemsClient.monitorViewForUnreadItems(this.options.monitorScrollPane, chatCollectionView);
            }, this);

            this.collection.on('add', function(){
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
  },

  onRender: function() {
    if (hasScrollBars()) {
      this.ui.primaryScroll.addClass("scroller");
    }
  }
});
