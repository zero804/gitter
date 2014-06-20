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
    var afterId = req.query.afterId;
    var marker = req.query.marker;
    var userId = req.user && req.user.id;

    var options = {
        skip: parseInt(skip, 10) || 0,
        limit: parseInt(limit, 10) || 50,
        beforeId: beforeId && "" + beforeId || null,
        afterId: afterId && "" + afterId || null,
        marker: marker && "" + marker || null,
        userId: userId
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
