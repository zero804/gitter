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
var onready = require('./utils/onready');
var appEvents = require('./utils/appevents');

var log = require('utils/log');

require('components/eyeballs');

// Preload widgets
require('views/widgets/avatar');
require('views/widgets/timeago');

onready(function() {

  appEvents.on('app.version.mismatch', function() {
    try {
      if(window.applicationCache.status == 1) {
        log.info('Attempting to update application cache');
        window.applicationCache.update();
      }
    } catch(e) {
      log.info('Unable to update application cache: ' + e, e);
    }
  });

  cordovaNav.syncNativeWithWebContext(context.troupe());

  var chatCollection = new chatModels.ChatCollection(null, { listen: true });
  cacheSync.install(chatCollection);

  var userCollection = new userModels.UserCollection(null, { listen: true });

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
    userCollection: userCollection
  }).render();

  $('html').removeClass('loading');


});
