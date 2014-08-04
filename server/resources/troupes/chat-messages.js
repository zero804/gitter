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
    var afterId = req.query.afterId;
    var aroundId = req.query.aroundId;
    var marker = req.query.marker;
    var userId = req.user && req.user.id;

    var options = {
        skip: parseInt(skip, 10) || 0,
        limit: parseInt(limit, 10) || 50,
        beforeId: beforeId && "" + beforeId || undefined,
        afterId: afterId && "" + afterId || undefined,
        aroundId: aroundId && "" + aroundId || undefined,
        marker: marker && "" + marker || undefined,
        userId: userId
    };

    return chatService.findChatMessagesForTroupe(req.troupe.id, options)
      .spread(function(chatMessages, limitReached) {
        var userId = req.user && req.user.id;

        var strategy = new restSerializer.ChatStrategy({
          currentUserId: userId,
          troupeId: req.troupe.id,
          initialId: aroundId
        });

        return [restSerializer.serialize(chatMessages, strategy), limitReached];
      })
      .spread(function(serialized, limitReached) {
        if(limitReached) {
          // Consider whether storing this in a header is a good idea
          // as headers don't get used to generate etags and therefore
          // result in cache nastiness
          res.set('LimitReached', 'true');
        }

        res.send(serialized);
      })
      .fail(next);

  },

  create: function(req, res, next) {
    var data = _.clone(req.body);
    data.stats = userAgentTags(req.headers['user-agent']);

    return chatService.newChatMessageToTroupe(req.troupe, req.user, data)
      .then(function (chatMessage) {
        var strategy = new restSerializer.ChatStrategy({ currentUserId: req.user.id, troupeId: req.troupe.id });
        return restSerializer.serialize(chatMessage, strategy);
      })
      .then(function(serialized) {
        res.send(serialized);
      })
      .fail(function(err) {
        return next(err);
      });
  },

  update: function(req, res, next) {
    return chatService.updateChatMessage(req.troupe, req.chatMessage, req.user, req.body.text)
      .then(function(chatMessage) {
        var strategy = new restSerializer.ChatStrategy({ currentUserId: req.user.id, troupeId: req.troupe.id });
        return restSerializer.serialize(chatMessage, strategy);
      })
      .then(function(serialized) {
        res.send(serialized);
      })
      .fail(function(err) {
        return next(err);
      });

  },

  load: function(id, callback) {
    chatService.findById(id, callback);
  }

};
