"use strict";

var chatModels        = require('../chat');
var context           = require('utils/context');
var unreadItemsClient = require('components/unread-items-client');
var errorHandle       = require('utils/live-collection-error-handle');
var ProxyCollection   = require('backbone-proxy-collection');
var Pool              = require('../../components/chat-cache/pool');
var appEvents         = require('../../utils/appevents');
var _                 = require('underscore');
var Promise           = require('bluebird');

function invokeChatPreload(pool, rooms) {
  // Get the most recent rooms
  var ids = _.chain(rooms)
    .filter(function(room) {
      return room.lastAccess;
    })
    .sortBy(function(a, b) {
      // Reverse sort
      return b.lastAccess - a.lastAccess;
    })
    .first(pool.size)
    .value();


  // TODO: wait for initial snapshot to return rather than waiting for a
  // predefined period of time
  Promise.delay(1000)
    .then(function() {
      Promise.each(ids, function(room) {
        // Preload the rooms in sequence
        return pool.preload(room.id, room.lastAccessTime);
      });
    });
}

function create() {
  var pool = new Pool(chatModels.ChatCollection, { idAttribute: "troupeId" });

  var initial = pool.get(context.getTroupeId());
  var chatCollection = new ProxyCollection({ collection: initial });

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

  appEvents.on('chat-cache:preload', function(rooms) {
    invokeChatPreload(pool, rooms);
  });

  return chatCollection;
}

if(!context.hasFeature('chat-cache')) {
  /* If the feature is not turned on, fallback to non-cached chats */
  module.exports = require('./chats');
} else {
  var chatCollection = create();
  window._chatCollection = chatCollection;
  module.exports = chatCollection;
}
