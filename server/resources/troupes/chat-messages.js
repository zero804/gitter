/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var chatService = require("../../services/chat-service"),
    restSerializer = require("../../serializers/rest-serializer");

module.exports = {
  id: 'chatMessage',
  index: function(req, res, next) {
    var skip = req.query.skip;
    var limit = req.query.limit;
    var beforeId = req.query.beforeId;

    var options = {
        skip: skip ? skip : 0,
        beforeId: beforeId ? beforeId : null,
        limit: limit ? limit: 50
    };

    chatService.findChatMessagesForTroupe(req.troupe.id, options, function(err, chatMessages) {
      if(err) return next(err);

      var userId = req.user && req.user.id;

      var strategy = new restSerializer.ChatStrategy({ currentUserId: userId, troupeId: req.troupe.id });
      restSerializer.serialize(chatMessages, strategy, function(err, serialized) {
        if(err) return next(err);
        res.send(serialized);
      });
    });
  },

  create: function(req, res, next) {
    chatService.newChatMessageToTroupe(req.troupe, req.user, req.body, function (err, chatMessage) {
      if(err) return next(err);

      var strategy = new restSerializer.ChatStrategy({ currentUserId: req.user.id, troupeId: req.troupe.id });
      console.log(chatMessage);

      restSerializer.serialize(chatMessage, strategy, function (err, serialized) {
        if(err) return next(err);
        res.send(serialized);
      });

    });
  },

  update:  function(req, res, next) {
    chatService.updateChatMessage(req.troupe, req.chatMessage, req.user, req.body.text, function(err, chatMessage) {
      if(err) return next(err);
       var strategy = new restSerializer.ChatStrategy({ currentUserId: req.user.id, troupeId: req.troupe.id });

        restSerializer.serialize(chatMessage, strategy, function(err, serialized) {
          if(err) return next(err);
          res.send(serialized);
        });
    });

  },

  load: function(id, callback) {
    chatService.findById(id, callback);
  }

};
