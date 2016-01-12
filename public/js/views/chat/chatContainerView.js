"use strict";

var Marionette = require('backbone.marionette');
var hasScrollBars = require('utils/scrollbar-detect');
var ChatCollectionView = require('views/chat/chatCollectionView');
var ChatConnectionIndicatorView = require('views/chat/chatConnectivityIndicatorView');
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
            unreadItemsClient.monitorViewForUnreadItems(this.options.monitorScrollPane, chatCollectionView);
          }

          return chatCollectionView;
        }
      },
      connectivityIndicator: {
        el: '.chat-connectivity-indicator-wrapper',
        init: function(options) {
          return new ChatConnectionIndicatorView();
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
