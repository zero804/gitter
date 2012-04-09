/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true */
"use strict";

var persistence = require("./persistence-service"),
    troupeService = require("./troupe-service"),
    mongoose = require("mongoose"),
    appEvents = require("../app-events"); // TODO: decouple service from socket

module.exports = {
  newChatMessageToTroupe: function(troupeId, user, text, callback) {
    troupeService.findById(troupeId, function(err, troupe) {
      if(err) return callback(err);
      if(!troupe) return callback();
      
      if(!troupeService.userHasAccessToTroupe(user, troupe)) return callback("Access denied");
   
      var chatMessage = new persistence.ChatMessage();
      chatMessage.fromUserId = user.id;
      chatMessage.toTroupeId = troupe.id;
      chatMessage.text = text;
      
      chatMessage.save(function (err) {
        if(err) return callback(err);
        
        appEvents.troupeChat(troupe.id, chatMessage.narrow(user, troupe));
        
        return callback(null, chatMessage);
      });
      
      
    });
  },
  
  findById: function(id, callback) {
    persistence.ChatMessage.findById(id, function(err, chatMessage) {
      callback(err, chatMessage);
    });
  },
  
  findChatMessagesForTroupe: function(troupeId, options, callback) {
    persistence.ChatMessage
      .where('toTroupeId', troupeId)
      .desc('sent')
      .limit(options.limit)
      .skip(options.skip)
      .slaveOk()
      .run(callback);
  }
  
  
};