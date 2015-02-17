"use strict";

var $ = require('jquery');
var appEvents = require('utils/appevents');
var context = require('utils/context');
var chatModels = require('collections/chat');
var ChatCollectionView = require('views/chat/chatCollectionView');
var Backbone = require('backbone');
var modalRegion = require('components/modal-region');
var MobileAppView = require('views/app/mobileAppView');
var emojiDecorator = require('views/chat/decorators/emojiDecorator');
var MobileLoginButton = require('views/mobile/mobileLoginButton');
var onready = require('./utils/onready');
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
    el: '#mainPage',
    hideMenu: true
  });

  var chatCollection = new chatModels.ChatCollection(null, { listen: true });

  var chatCollectionView = new ChatCollectionView({
    el: '#chat-container',
    collection: chatCollection,
    decorators: [emojiDecorator]
  }).render();

  new MobileLoginButton({
    el: '#login-footer',
  }).render();

  var Router = Backbone.Router.extend({
    routes: {
      "": "hideModal"
    },

    hideModal: function() {
      modalRegion.close();
    },
  });

  new Router();

  $('html').removeClass('loading');

  Backbone.history.start();

  if (context().permalinkChatId) {
    highlightPermalinkChats(chatCollectionView, context().permalinkChatId);
  }

});
