"use strict";
var $ = require('jquery');
var context = require('utils/context');
var cordovaNav = require('components/cordova-navigate');
var chatModels = require('collections/chat');
var userModels = require('collections/users');
var ChatCollectionView = require('views/chat/chatCollectionView');
var chatInputView = require('views/chat/chatInputView');
var unreadItemsClient = require('components/unread-items-client');
var cacheSync = require('components/cache-sync');
var emojiDecorator = require('views/chat/decorators/emojiDecorator');
var mobileDecorator = require('views/chat/decorators/mobileDecorator');
var log = require('utils/log');
require('components/eyeballs');

module.exports = (function() {


  $(document).on('app.version.mismatch', function() {
    try {
      if(window.applicationCache.status == 1) {
        log('Attempting to update application cache');
        window.applicationCache.update();
      }
    } catch(e) {
      log('Unable to update application cache: ' + e, e);
    }
  });

  cordovaNav.syncNativeWithWebContext(context.troupe());

  var chatCollection = new chatModels.ChatCollection();
  cacheSync.install(chatCollection);
  chatCollection.listen();

  var userCollection = new userModels.UserCollection();
  userCollection.listen();

  var chatCollectionView = new ChatCollectionView({
    el: $('#content-frame'),
    collection: chatCollection,
    decorators: [emojiDecorator, mobileDecorator]
  }).render();

  unreadItemsClient.syncCollections({
    'chat': chatCollection
  });

  unreadItemsClient.monitorViewForUnreadItems($('#content-frame'));

  new chatInputView.ChatInputView({
    el: $('#chat-input'),
    collection: chatCollection,
    rollers: chatCollectionView.rollers,
    userCollection: userCollection,
    compactView: true
  }).render();

  $('html').removeClass('loading');


})();

