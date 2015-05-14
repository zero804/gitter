"use strict";
var $ = require('jquery');

var Marionette = require('backbone.marionette');
var appEvents = require('utils/appevents');
var modalRegion = require('components/modal-region');
var hasScrollBars = require('utils/scrollbar-detect');
var ChatCollectionView = require('views/chat/chatCollectionView');

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

  ui: {
    scrollToBottom: '.js-scroll-to-bottom',
  },

  events: {
    'click @ui.scrollToBottom': appEvents.trigger.bind(appEvents, 'chatCollectionView:scrollToBottom')
  },

  regions: {
    chat: '#chat-container',
  },

  initialize: function(options) {
    this.chatCollection = options.chatCollection;

    // Setup the ChatView - this is instantiated once for the application, and shared between many views
    this.listenTo(this.chatCollection, 'atBottomChanged', function(isBottom) {
      this.ui.scrollToBottom.toggleClass('scrollHelper--hidden', isBottom);
    });

    this.dialogRegion = modalRegion;
  },

  initChatRegion: function(optionsForRegion) {
    /* TODO: Give this stuff a proper home */
    if (hasScrollBars()) {
      $(".primary-scroll").addClass("scroller");
    }

    var chatCollectionView = this.chatCollectionView = new ChatCollectionView(optionsForRegion('chat', {
      collection: this.chatCollection,
      decorators: [issueDecorator, commitDecorator, mentionDecorator, embedDecorator, emojiDecorator]
    }));

    return chatCollectionView;
  }

});

module.exports = ChatLayout;
