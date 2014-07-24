/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var chatService = require('../../services/chat-service');
var restSerializer = require('../../serializers/rest-serializer');
var userAgentTags = require('../../utils/user-agent-tagger');
var _ = require('underscore');

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

    return chatService.findChatMessagesForTroupe(req.troupe.id, options)
      .spread(function(chatMessages, limitReached) {
        var userId = req.user && req.user.id;

        var strategy = new restSerializer.ChatStrategy({ currentUserId: userId, troupeId: req.troupe.id });

        return restSerializer.serialize(chatMessages, strategy)
          .then(function(serialized) {
            if(limitReached) {
              res.set('LimitReached', limitReached);
            }

            res.send(serialized);
          });
      })
      .fail(next);

  },

  create: function(req, res, next) {
    var data = _.clone(req.body);
    data.stats = userAgentTags(req.headers['user-agent']);

    chatService.newChatMessageToTroupe(req.troupe, req.user, data, function (err, chatMessage) {
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
