"use strict";

var Marionette = require('backbone.marionette');
var hasScrollBars = require('utils/scrollbar-detect');
var appEvents = require('utils/appevents');
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
        init: 'initConnectivityIndicatorView'
      }
    }
  },

  initConnectivityIndicatorView: function(optionsForRegion) {
    if(context.hasFeature('connectivity-indicator')) {
      return new ChatConnectionIndicatorView(optionsForRegion({ }));
    }
  },


  ui: {
    primaryScroll: '.primary-scroll',
  },

  events: {
    'click': 'onClick',
  },

  onRender: function() {
    if (hasScrollBars()) {
      this.ui.primaryScroll.addClass("scroller");
    }
  },

  onClick: function(e) {
    var hasTextSelected = window.getSelection().toString().length > 0;
    if(!hasTextSelected && e.target.tagName.toLowerCase() !== 'textarea') {
      appEvents.trigger('focus.request.chat');
    }
  }
});
