"use strict";
var $ = require('jquery');
var appEvents = require('utils/appevents');
var chatInputView = require('views/chat/chatInputView');
var itemCollections = require('collections/instances/integrated-items');
var cocktail = require('cocktail');
var KeyboardEventsMixin = require('views/keyboard-events-mixin');
var unreadItemsClient = require('components/unread-items-client');
var UnreadBannerView = require('views/app/unreadBannerView');
var ChatToolbarLayout = require('./chat-toolbar');
require('views/behaviors/isomorphic');

var ChatToolbarInputLayout = ChatToolbarLayout.extend({
  keyboardEvents: {
    'backspace': 'onKeyBackspace',
    'quote': 'onKeyQuote'
  },

  behaviors: {
    Isomorphic: {
      chat: {
        el: '#content-wrapper',
        init: 'initChatRegion' // Declared in super
      },

      toolbar: {
        el: "#right-toolbar-layout",
        init: 'initToolbarRegion'  // Declared in super
      },

      input: {
        el: '#chat-input',
        init: 'initInputRegion'
      },

      bannerTop: {
        el: '#unread-banner',
        init: 'initBannerTopRegion'
      },

      bannerBottom: {
        el: '#bottom-unread-banner',
        init: 'initBannerBottomRegion'
      }
    }
  },

  initialize: function(options) {
    ChatToolbarLayout.prototype.initialize.call(this, options);

    // TODO: fix this
    itemCollections.chats.once('sync', function() {
      /* Why is this on sync only? */
      unreadItemsClient.monitorViewForUnreadItems($('#content-frame'));
    });
  },

  initInputRegion: function(optionsForRegion) {
    return new chatInputView.ChatInputView(optionsForRegion({
      collection: itemCollections.chats
    }));
  },

  initBannerTopRegion: function(optionsForRegion) {
    return new UnreadBannerView.Top(optionsForRegion({
      model: unreadItemsClient.acrossTheFold()
    }));
  },

  initBannerBottomRegion: function(optionsForRegion) {
    return new UnreadBannerView.Bottom(optionsForRegion({
      model: unreadItemsClient.acrossTheFold()
    }));
  },

  onKeyBackspace: function(e) {
    e.stopPropagation();
    e.preventDefault();
  },

  onKeyQuote: function(e) {
    e.preventDefault();
    e.stopPropagation();
    this.quoteText();
  },

  getSelectionText: function() {
    var text = "";
    if (window.getSelection) {
      text = window.getSelection().toString();
    } else if (document.selection && document.selection.type != "Control") {
      text = document.selection.createRange().text;
    }
    return text;
  },

  quoteText: function() {
    var selectedText = this.getSelectionText();
    if (selectedText.length > 0) {
      appEvents.trigger('input.append', "> " + selectedText, { newLine: true });
    }
  },
});

cocktail.mixin(ChatToolbarInputLayout, KeyboardEventsMixin);

module.exports = ChatToolbarInputLayout;
