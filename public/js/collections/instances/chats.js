'use strict';

var chatModels = require('../chat');
var context = require('gitter-web-client-context');
var unreadItemsClient = require('../../components/unread-items-client');
var errorHandle = require('../../utils/live-collection-error-handle');

const chats = window.troupeContext.chats
  ? window.troupeContext.chats.map(ch => new chatModels.ChatModel(ch, { parse: true }))
  : null;
var chatCollection = new chatModels.ChatCollection(chats, { listen: true });

chatCollection.on('error', errorHandle.bind(null, 'chat-collection'));

// Keep the unread items up to date on the model
// This allows the unread items client to mark model items as read
if (context.isLoggedIn()) {
  unreadItemsClient.syncCollections({
    chat: chatCollection
  });
}

window._chatCollection = chatCollection;
module.exports = chatCollection;
