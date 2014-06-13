/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var chatService       = require("../../services/chat-service");
var winston           = require('../../utils/winston');
var collections       = require("../../utils/collections");
var ChatStrategy      = require('./chat-strategy');
var execPreloads      = require('../exec-preloads');

function ChatIdStrategy(options) {
  var chatStrategy = new ChatStrategy(options);
  var self = this;

  this.preload = function(ids, callback) {
    chatService.findByIds(ids, function(err, chats) {
      if(err) {
        winston.error("Error loading chats", { exception: err });
        return callback(err);
      }
      self.chats = collections.indexById(chats);

      execPreloads([{
        strategy: chatStrategy,
        data: chats
      }], callback);

    });
  };

  this.map = function(chatId) {
    var chat = self.chats[chatId];
    if(!chat) {
      winston.warn("Unable to locate chatId ", { chatId: chatId });
      return null;
    }

    return chatStrategy.map(chat);
  };

}

module.exports = ChatIdStrategy;