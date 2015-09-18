"use strict";

var chatService    = require('../../../services/chat-service');
var restSerializer = require('../../../serializers/rest-serializer');
var userAgentTags  = require('../../../utils/user-agent-tagger');
var _              = require('underscore');
var StatusError    = require('statuserror');
var paramLoaders   = require('./param-loaders');

module.exports = {
  id: 'chatMessageId',
  index: function(req, res, next) {
    var skip = req.query.skip;
    var limit = req.query.limit;
    var beforeId = req.query.beforeId;
    var afterId = req.query.afterId;
    var aroundId = req.query.aroundId;
    var lang = req.query.lang;
    var marker = req.query.marker;
    var q = req.query.q;
    var userId = req.user && req.user.id;
    var troupeId = req.params.troupeId;
    var options;

    var query;
    if(q) {
      options = {
        skip: parseInt(skip, 10) || 0,
        limit: parseInt(limit, 10) || 50,
        lang: lang,
        userId: userId
      };

      query = chatService.searchChatMessagesForRoom(troupeId, "" + q, options);
    } else {
      options = {
        skip: parseInt(skip, 10) || 0,
        limit: parseInt(limit, 10) || 50,
        beforeId: beforeId && "" + beforeId || undefined,
        afterId: afterId && "" + afterId || undefined,
        aroundId: aroundId && "" + aroundId || undefined,
        marker: marker && "" + marker || undefined,
        userId: userId
      };
      query = chatService.findChatMessagesForTroupe(troupeId, options);
    }

    return query
      .then(function(chatMessages) {
        var userId = req.user && req.user.id;
        var strategy = new restSerializer.ChatStrategy({
          currentUserId: userId,
          troupeId: troupeId,
          initialId: aroundId
        });

        return restSerializer.serialize(chatMessages, strategy);
      })
      .then(function(serialized) {
        res.send(serialized);
      })
      .catch(next);

  },

  create: [paramLoaders.troupeLoader, function(req, res, next) {
    var data = _.clone(req.body);
    data.stats = userAgentTags(req.headers['user-agent']);

    return chatService.newChatMessageToTroupe(req.troupe, req.user, data)
      .then(function (chatMessage) {
        var strategy = new restSerializer.ChatStrategy({ currentUserId: req.user.id, troupeId: req.params.troupeId });
        return restSerializer.serialize(chatMessage, strategy);
      })
      .then(function(serialized) {
        res.send(serialized);
      })
      .catch(next);
  }],

  show: function(req, res, next) {
    // TODO: ensure troupeId matches
    var strategy = new restSerializer.ChatIdStrategy({ currentUserId: req.user.id, troupeId: req.params.troupeId });
    return restSerializer.serialize(req.params.chatMessageId, strategy)
      .then(function(serialized) {
        res.send(serialized);
      })
      .catch(next);
  },

  update: [paramLoaders.troupeLoader, function(req, res, next) {
    return chatService.findById(req.params.chatMessageId)
      .then(function(chatMessage) {
        if (!chatMessage) throw new StatusError(404);
        return chatService.updateChatMessage(req.troupe, chatMessage, req.user, req.body.text);
      })
      .then(function(chatMessage) {
        var strategy = new restSerializer.ChatStrategy({ currentUserId: req.user.id, troupeId: req.params.troupeId });
        return restSerializer.serialize(chatMessage, strategy);
      })
      .then(function(serialized) {
        res.send(serialized);
      })
      .catch(function(err) {
        return next(err);
      });
  }],

  subresources: {
    'readBy': require('./chat-read-by')
  }

};
