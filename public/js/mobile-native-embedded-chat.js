"use strict";
var $ = require('jquery');
var context = require('utils/context');
var cordovaNav = require('components/cordova-navigate');
var chatModels = require('collections/chat');
var ChatCollectionView = require('views/chat/chatCollectionView');
var chatInputView = require('views/chat/chatInputView');
var unreadItemsClient = require('components/unread-items-client');
var cacheSync = require('components/cache-sync');
var emojiDecorator = require('views/chat/decorators/emojiDecorator');
var mobileDecorator = require('views/chat/decorators/mobileDecorator');
var log = require('utils/log');
var onready = require('./utils/onready');
var appEvents = require('./utils/appevents');

require('components/eyeballs');
require('components/ping');

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

  var chatCollectionView = new ChatCollectionView({
    el: $('#chat-container'),
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
    compactView: true
  }).render();

  $('html').removeClass('loading');
});
