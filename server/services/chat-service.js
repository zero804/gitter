/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true */
"use strict";

var persistence = require("./persistence-service"),
    troupeService = require("./troupe-service"),
    restSerializer = require("../serializers/rest-serializer"),
    appEvents = require("../app-events"); // TODO: decouple service from socket

module.exports = {
  newChatMessageToTroupe: function(troupe, user, text, callback) {
    if(!troupe) return callback("Invalid troupe");

    if(!troupeService.userHasAccessToTroupe(user, troupe)) return callback("Access denied");

    var chatMessage = new persistence.ChatMessage();
    chatMessage.fromUserId = user.id;
    chatMessage.toTroupeId = troupe.id;
    chatMessage.text = text;
    chatMessage.save(function (err) {
      if(err) return callback(err);

      var strategy = new restSerializer.ChatStrategy({ user: user, troupeId: troupe.id });
      restSerializer.serialize(chatMessage, strategy, function(err, serialized) {
        if(err) return callback(err);

        appEvents.troupeChat(troupe.id, serialized);
      });

      return callback(null, chatMessage);
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