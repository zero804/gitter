"use strict";
var $ = require('jquery');
var _ = require('underscore');
var appEvents = require('utils/appevents');
var chatInputView = require('views/chat/chatInputView');
var itemCollections = require('collections/instances/integrated-items');
var cocktail = require('cocktail');
var KeyboardEventsMixin = require('views/keyboard-events-mixin');
var unreadItemsClient = require('components/unread-items-client');
var UnreadBannerView = require('views/app/unreadBannerView');
var ChatToolbarLayout = require('./chat-toolbar');
var hasScrollBars = require('utils/scrollbar-detect');

var ChatToolbarInputLayout = ChatToolbarLayout.extend({
  keyboardEvents: {
    'backspace': 'onKeyBackspace',
    'quote': 'onKeyQuote'
  },

  /* Extend the regions from ChatToolbarLayout */
  regions: _.extend({}, ChatToolbarLayout.prototype.regions, {
    input: '#chat-input',
    bannerTop: '#unread-banner',
    bannerBottom: '#bottom-unread-banner'
  }),

  initialize: function(options) {
    ChatToolbarLayout.prototype.initialize.call(this, options);

    // TODO: fix this
    itemCollections.chats.once('sync', function() {
      /* Why is this on sync only? */
      unreadItemsClient.monitorViewForUnreadItems($('#content-frame'));
    });
  },

  initInputRegion: function(optionsForRegion) {
    /* TODO: Give this stuff a proper home */
    if (hasScrollBars()) {
      this.ui.input.addClass("scrollpush");
    }

    var chatCollectionView = this.chatCollectionView; // Initialized in chat.js
    return new chatInputView.ChatInputView(optionsForRegion('input', {
      collection: itemCollections.chats,
      chatCollectionView: chatCollectionView,
      rollers: chatCollectionView.rollers
    }));
  },

  initBannerTopRegion: function() {
    return new UnreadBannerView.Top({
      model: unreadItemsClient.acrossTheFold(),
      chatCollectionView: this.chatCollectionView
    });
  },

  initBannerBottomRegion: function() {
    return new UnreadBannerView.Bottom({
      model: unreadItemsClient.acrossTheFold(),
      chatCollectionView: this.chatCollectionView
    });
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
