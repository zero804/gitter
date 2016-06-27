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

require('./components/eyeballs-room-sync');
require('components/ping');

// Preload widgets
require('views/widgets/avatar');
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
    // Im Andy Trevorah and I wrote this instead of using region switching because:
    // a) we need to hide the border between chat collection view and chat input
    // b) using web textinput on native apps is on its way out anyway
    // c) im lazy
    $chatInputWrapper.hide();
  }

  new ChatInputView({
    el: $('#chat-input'),
    collection: chatCollection,
  }).render();

  room.on('change:roomMember', function(room, isMember) {
    // Im Andy Trevorah and I wrote this instead of using region switching because:
    // a) we need to hide the border between chat collection view and chat input
    // b) using web textinput on native apps is on its way out anyway
    // c) im so lazy that I copy and paste all my excuses
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
