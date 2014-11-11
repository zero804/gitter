"use strict";
var $ = require('jquery');
var appEvents = require('utils/appevents');
var chatModels = require('collections/chat');
var userModels = require('collections/users');
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

module.exports = (function() {


  new MobileAppView({
    el: $('#mainPage')
  });

  new TroupeMenu({
    el: $('#troupeList')
  }).render();

  appEvents.on('navigation', function(url) {
    window.location.href = url;
  });

  var chatCollection = new chatModels.ChatCollection();
  chatCollection.listen();

  var userCollection = new userModels.UserCollection();
  userCollection.listen();

  var chatCollectionView = new ChatCollectionView({
    el: $('#content-frame'),
    collection: chatCollection,
    decorators: [emojiDecorator, mobileDecorator]
  }).render();

  unreadItemsClient.monitorViewForUnreadItems($('#content-frame'));

  new chatInputView.ChatInputView({
    el: $('#chat-input'),
    collection: chatCollection,
    userCollection: userCollection,
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


})();

