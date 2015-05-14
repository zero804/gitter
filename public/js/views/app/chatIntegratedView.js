"use strict";
var $ = require('jquery');

var Marionette = require('backbone.marionette');
var appEvents = require('utils/appevents');
var uiVars = require('views/app/uiVars');
var chatInputView = require('views/chat/chatInputView');
var itemCollections = require('collections/instances/integrated-items');
var modalRegion = require('components/modal-region');
var hasScrollBars = require('utils/scrollbar-detect');
var cocktail = require('cocktail');
var KeyboardEventsMixin = require('views/keyboard-events-mixin');
var ChatCollectionView = require('views/chat/chatCollectionView');
var issueDecorator = require('views/chat/decorators/issueDecorator');
var commitDecorator = require('views/chat/decorators/commitDecorator');
var mentionDecorator = require('views/chat/decorators/mentionDecorator');
var embedDecorator = require('views/chat/decorators/embedDecorator');
var emojiDecorator = require('views/chat/decorators/emojiDecorator');
var UnreadBannerView = require('views/app/unreadBannerView');
var RightToolbarView = require('views/righttoolbar/rightToolbarView');
var unreadItemsClient = require('components/unread-items-client');
require('views/behaviors/isomorphic');

require('transloadit');

module.exports = (function() {

  var ChatLayout = Marionette.LayoutView.extend({
    template: false,
    el: 'body',

    behaviors: {
      Isomorphic: {}
    },

    ui: {
      scrollToBottom: '.js-scroll-to-bottom',
      progressBar: '#file-progress-bar',
      dragOverlay: '.js-drag-overlay'
    },

    events: function() {
      if (uiVars.isMobile) {
        return {
          "keypress": "onKeyPress",
          'click @ui.scrollToBottom': appEvents.trigger.bind(appEvents, 'chatCollectionView:scrollToBottom')
        };
      }

      return {
        "click .js-favourite-button": "toggleFavourite",
        'click @ui.scrollToBottom': appEvents.trigger.bind(appEvents, 'chatCollectionView:scrollToBottom'),
      };
    },

    keyboardEvents: {
      'backspace': 'onKeyBackspace',
      'quote': 'onKeyQuote'
    },

    regions: {
      toolbar: "#right-toolbar-layout",
      chat: '#chat-container',
      input: '#chat-input',
      bannerTop: '#unread-banner',
      bannerBottom: '#bottom-unread-banner'
    },

    initialize: function() {
      // Setup the ChatView - this is instantiated once for the application, and shared between many views
      this.listenTo(itemCollections.chats, 'atBottomChanged', function(isBottom) {
        this.ui.scrollToBottom.toggleClass('scrollHelper--hidden', isBottom);
      });

      // this.chatCollectionView = chatCollectionView;
      this.dialogRegion = modalRegion;
    },

    initRegions: function(optionsForRegion) {
      var unreadChatsModel = unreadItemsClient.acrossTheFold();

      itemCollections.chats.once('sync', function() {
        /* Why is this on sync only? */
        unreadItemsClient.monitorViewForUnreadItems($('#content-frame'));
      });

      /* TODO: Give this stuff a proper home */
      if (hasScrollBars()) {
        $(".primary-scroll").addClass("scroller");
        $(".js-chat-input-container").addClass("scrollpush");
      }

      var chatCollectionView = this.chatCollectionView = new ChatCollectionView(optionsForRegion('chat', {
        collection: itemCollections.chats,
        decorators: [issueDecorator, commitDecorator, mentionDecorator, embedDecorator, emojiDecorator]
      }));

      var inputRegion = new chatInputView.ChatInputView(optionsForRegion('input', {
        collection: itemCollections.chats,
        chatCollectionView: chatCollectionView,
        rollers: chatCollectionView.rollers
      }));

      return {
        chat: chatCollectionView,
        input: inputRegion,
        toolbar: new RightToolbarView(optionsForRegion('toolbar')),
        bannerTop: new UnreadBannerView.Top({
          model: unreadChatsModel,
          chatCollectionView: this.chatCollectionView
        }),
        bannerBottom: new UnreadBannerView.Bottom({
          model: unreadChatsModel,
          chatCollectionView: this.chatCollectionView
        })
      };
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

  cocktail.mixin(ChatLayout, KeyboardEventsMixin);

  return ChatLayout;

})();
