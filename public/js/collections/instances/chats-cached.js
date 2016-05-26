"use strict";

var chatModels = require('../chat');
var context = require('utils/context');
var unreadItemsClient = require('components/unread-items-client');
var errorHandle = require('utils/live-collection-error-handle');
var ProxyCollection = require('backbone-proxy-collection');
var Pool = require('../../components/chat-cache/pool');
var appEvents = require('../../utils/appevents');
var Promise = require('bluebird');
var selectCacheCandidates = require('../../components/chat-cache/select-cache-candidates');
var frameUtils = require('../../utils/frame-utils');

function invokeChatPreload(pool, rooms) {
  var cacheRooms = selectCacheCandidates(pool.size, rooms);

  return Promise.each(cacheRooms, function(room) {
    // Preload the rooms in sequence
    return pool.preload(room.id, room.lastAccessTime);
  });
}

function create() {
  var pool = new Pool(chatModels.ChatCollection, { idAttribute: "troupeId" });

  var currentRoomId = context.getTroupeId();
  var initialPromise = pool.preload(currentRoomId, Date.now());

  var initial = pool.get(currentRoomId);
  var chatCollection = new ProxyCollection({
    collection: initial,
    klass: chatModels.ChatCollection,
    properties: ['loading']
  });

  context.contextModel().on('change:troupeId', function() {
    var troupeId = context.getTroupeId();

    var newCollection = pool.get(troupeId);
    chatCollection.switchCollection(newCollection);
  });

  chatCollection.on('error', errorHandle.bind(null, 'chat-collection'));

  // Keep the unread items up to date on the model
  // This allows the unread items client to mark model items as read
  if(context.isLoggedIn()) {
    unreadItemsClient.syncCollections({
      'chat': chatCollection
    });
  }

  initialPromise.then(function() {
    //request the room list from the parent application
    frameUtils.postMessage({ type: 'request:roomList' });

    appEvents.once('chat-cache:preload', function(rooms) {
      invokeChatPreload(pool, rooms);
    });
  });


  return chatCollection;
}

if(!context.hasFeature('chat-cache') || !frameUtils.hasParentFrameSameOrigin()) {
  /* If the feature is not turned on, fallback to non-cached chats */
  module.exports = require('./chats');
} else {
  var chatCollection = create();
  window._chatCollection = chatCollection;
  module.exports = chatCollection;
}
