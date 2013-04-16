/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var chatService = require("../../services/chat-service"),
    restSerializer = require("../../serializers/rest-serializer");

module.exports = {
    index: function(req, res, next) {
      var skip = req.query.skip;
      var limit = req.query.limit;

      var options = {
          skip: skip ? skip : 0,
          limit: limit ? limit: 50
      };

      chatService.findChatMessagesForTroupe(req.troupe.id, options, function(err, chatMessages) {
        if(err) return next(err);

        var strategy = new restSerializer.ChatStrategy({ currentUserId: req.user.id, troupeId: req.troupe.id });
        restSerializer.serialize(chatMessages, strategy, function(err, serialized) {
          if(err) return next(err);
          res.send(serialized);
        });
      });
    },

    'new': function(req, res){
      res.send(500);
    },

    create: function(req, res, next) {
      chatService.newChatMessageToTroupe(req.troupe, req.user, req.body.text, function(err, chatMessage) {
        if(err) return next(err);

        var strategy = new restSerializer.ChatStrategy({ currentUserId: req.user.id, troupeId: req.troupe.id });

        restSerializer.serialize(chatMessage, strategy, function(err, serialized) {
          if(err) return next(err);
          res.send(serialized);
        });
      });
    },

    update:  function(req, res){
      console.log(">>>>>>>>>>>>>>>>>>>>>", this, req.body);
      res.send(500);
    },

    destroy: function(req, res){
      res.send(500);
    },

    load: function(id, callback) {
      chatService.findById(id, callback);
    }

};
