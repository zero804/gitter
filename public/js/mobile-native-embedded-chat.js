"use strict";
var $ = require('jquery');
var context = require('utils/context');
var liveContext = require('components/live-context');
var cordovaNav = require('components/cordova-navigate');
var chatModels = require('collections/chat');
var ChatCollectionView = require('views/chat/chatCollectionView');
var ChatInputView = require('views/chat/chatInputView');
var unreadItemsClient = require('components/unread-items-client');
var emojiDecorator = require('views/chat/decorators/emojiDecorator');
var mobileDecorator = require('views/chat/decorators/mobileDecorator');
var onready = require('./utils/onready');
var FastClick = require('fastclick');

require('components/eyeballs');
require('components/ping');

// Preload widgets
require('views/widgets/avatar');
require('views/widgets/timeago');
require('template/helpers/all');

onready(function() {
  FastClick.attach(document.body);

  cordovaNav.syncNativeWithWebContext(context.troupe());

  var chatCollection = new chatModels.ChatCollection(null, { listen: true });

  var chatCollectionView = new ChatCollectionView({
    el: $('#chat-container'),
    collection: chatCollection,
    decorators: [emojiDecorator, mobileDecorator]
  }).render();

  unreadItemsClient.syncCollections({
    'chat': chatCollection
  });

  unreadItemsClient.monitorViewForUnreadItems($('#content-frame'), chatCollectionView);

  var $chatInputWrapper = $('#chat-input-wrapper');
  var room = context.troupe();

  if (!room.get('roomMember')) {
    $chatInputWrapper.hide();
  }

  new ChatInputView({
    el: $('#chat-input'),
    collection: chatCollection,
  }).render();

  room.on('change:roomMember', function(room, isMember) {
    if (isMember) {
      $chatInputWrapper.show();
    } else {
      $chatInputWrapper.hide();
    }
  });

  // Listen for changes to the room
  liveContext.syncRoom();

  $('html').removeClass('loading');
});
