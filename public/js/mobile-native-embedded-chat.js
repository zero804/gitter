"use strict";
var $ = require('jquery');
var context = require('./utils/context');
var liveContext = require('./components/live-context');
var chatModels = require('./collections/chat');
var ChatCollectionView = require('views/chat/chatCollectionView');
var unreadItemsClient = require('./components/unread-items-client');
var emojiDecorator = require('views/chat/decorators/emojiDecorator');
var mobileDecorator = require('views/chat/decorators/mobileDecorator');
var onready = require('././utils/onready');
var FastClick = require('fastclick');
var appEvents = require('./utils/appevents');

require('./components/eyeballs-room-sync');
require('./components/ping');

// Preload widgets
require('views/widgets/avatar');
require('template/helpers/all');

onready(function() {
  FastClick.attach(document.body);

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

  // used by the ios native app v3.5.0+
  window._sendMessage = function(text) {
    var newMessage = {
      text: text,
      fromUser: context.getUser(),
      sent: null,
    };
    chatCollection.create(newMessage);
    appEvents.trigger('chat.send');
  };

  // Listen for changes to the room
  liveContext.syncRoom();

  $('html').removeClass('loading');
});
