"use strict";

var chatService       = require("../../services/chat-service");
var collections       = require("../../utils/collections");
var ChatStrategy      = require('./chat-strategy');

function ChatIdStrategy(options) {
  var chatStrategy = new ChatStrategy(options);
  var chatsIndexed;

  this.preload = function(ids) {
    return chatService.findByIds(ids)
      .then(function(chats) {
        chatsIndexed = collections.indexById(chats);
        return chatStrategy.preload(chats);
      });
  };

  this.map = function(chatId) {
    var chat = chatsIndexed[chatId];
    if(!chat) {
      return null;
    }

    return chatStrategy.map(chat);
  };

}
ChatIdStrategy.prototype = {
  name: 'ChatIdStrategy'
};


module.exports = ChatIdStrategy;
