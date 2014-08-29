/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var chatService       = require("../../services/chat-service");
var winston           = require('../../utils/winston');
var collections       = require("../../utils/collections");
var ChatStrategy      = require('./chat-strategy');
var execPreloads      = require('../exec-preloads');

function ChatIdStrategy(options) {
  var chatStrategy = new ChatStrategy(options);
  var chatsIndexed;

  this.preload = function(ids, callback) {
    chatService.findByIds(ids, function(err, chats) {
      if(err) {
        winston.error("Error loading chats", { exception: err });
        return callback(err);
      }
      chatsIndexed = collections.indexById(chats);

      execPreloads([{
        strategy: chatStrategy,
        data: chats
      }], callback);

    });
  };

  this.map = function(chatId) {
    var chat = chatsIndexed[chatId];
    if(!chat) {
      winston.warn("Unable to locate chatId ", { chatId: chatId });
      return null;
    }

    return chatStrategy.map(chat);
  };

}
ChatIdStrategy.prototype = {
  name: 'ChatIdStrategy'
};


module.exports = ChatIdStrategy;
