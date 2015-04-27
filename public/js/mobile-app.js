"use strict";
var $ = require('jquery');
var appEvents = require('utils/appevents');
var chatModels = require('collections/chat');
var ChatCollectionView = require('views/chat/chatCollectionView');
var chatInputView = require('views/chat/chatInputView');
var unreadItemsClient = require('components/unread-items-client');
var Backbone = require('backbone');
var modalRegion = require('components/modal-region');
var TroupeMenu = require('views/menu/troupeMenu');
var MobileAppView = require('views/app/mobileAppView');
var emojiDecorator = require('views/chat/decorators/emojiDecorator');
var mobileDecorator = require('views/chat/decorators/mobileDecorator');
var TroupeSettingsView = require('views/app/troupeSettingsView');
var onready = require('./utils/onready');
var context = require('utils/context');
var highlightPermalinkChats = require('./utils/highlight-permalink-chats');

// Preload widgets
require('views/widgets/avatar');
require('views/widgets/timeago');
require('components/ping');

onready(function() {

  require('components/link-handler').installLinkHandler();
  appEvents.on('navigation', function(url) {
    window.location.href = url;
  });

  new MobileAppView({
    el: $('#mainPage')
  });

  new TroupeMenu({
    el: $('#troupeList')
  }).render();


  var chatCollection = new chatModels.ChatCollection(null, { listen: true });

  var chatCollectionView = new ChatCollectionView({
    el: $('#chat-container'),
    collection: chatCollection,
    decorators: [emojiDecorator, mobileDecorator]
  }).render();

  unreadItemsClient.monitorViewForUnreadItems($('#content-frame'));

  new chatInputView.ChatInputView({
    el: $('#chat-input'),
    collection: chatCollection,
    rollers: chatCollectionView.rollers
  }).render();

  var Router = Backbone.Router.extend({
    routes: {
      // TODO: get rid of the pipes
      "!": "hideModal",                  // TODO: remove this soon
      "": "hideModal",
      "notifications": "notifications",
      "|notifications": "notifications", // TODO: remove this soon
    },

    hideModal: function() {
      modalRegion.close();
    },

    notifications: function() {
      modalRegion.show(new TroupeSettingsView({}));
    }
  });

  new Router();

  $('html').removeClass('loading');

  Backbone.history.start();

  if (context().permalinkChatId) {
    highlightPermalinkChats(chatCollectionView, context().permalinkChatId);
  }

});
