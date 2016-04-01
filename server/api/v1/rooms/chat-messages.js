"use strict";

var chatService         = require('../../../services/chat-service');
var restSerializer      = require('../../../serializers/rest-serializer');
var userAgentTags       = require('../../../utils/user-agent-tagger');
var _                   = require('underscore');
var StatusError         = require('statuserror');
var loadTroupeFromParam = require('./load-troupe-param');
var Promise             = require('bluebird');


function parseLookups(lookups) {
  // string of comma-delimited attributes passed in via req.query
  if (!lookups) {
    return undefined;
  }
  return lookups.split(',');
}

module.exports = {
  id: 'chatMessageId',
  index: function(req) {
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
    var lean = !!req.query.lean;
    var lookups = parseLookups(req.query.lookups)
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
          initialId: aroundId,
          lean: lean,
          lookups: lookups
        });

        return restSerializer.serialize(chatMessages, strategy);
      });
  },

  create: function(req) {
    return loadTroupeFromParam(req)
      .then(function(troupe) {
        var data = _.clone(req.body);
        data.stats = userAgentTags(req.headers['user-agent']);

        return chatService.newChatMessageToTroupe(troupe, req.user, data);
      })
      .then(function(chatMessage) {
        var strategy = new restSerializer.ChatStrategy({ currentUserId: req.user.id, troupeId: req.params.troupeId });
        return restSerializer.serializeObject(chatMessage, strategy);
      });
  },

  show: function(req) {
    // TODO: ensure troupeId matches
    var strategy = new restSerializer.ChatIdStrategy({ currentUserId: req.user.id, troupeId: req.params.troupeId });
    return restSerializer.serializeObject(req.params.chatMessageId, strategy);
  },

  update: function(req) {
    return Promise.all([loadTroupeFromParam(req), chatService.findById(req.params.chatMessageId)])
      .spread(function(troupe, chatMessage) {
        if (!chatMessage) throw new StatusError(404);
        return chatService.updateChatMessage(troupe, chatMessage, req.user, req.body.text);
      })
      .then(function(chatMessage) {
        var strategy = new restSerializer.ChatStrategy({ currentUserId: req.user.id, troupeId: req.params.troupeId });
        return restSerializer.serializeObject(chatMessage, strategy);
      });
  },

  subresources: {
    'readBy': require('./chat-read-by')
  }

};
