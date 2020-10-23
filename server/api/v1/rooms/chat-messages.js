'use strict';

var Promise = require('bluebird');
var _ = require('lodash');
var StatusError = require('statuserror');
const asyncHandler = require('express-async-handler');
var chatService = require('gitter-web-chats');
var restSerializer = require('../../../serializers/rest-serializer');
var userAgentTagger = require('../../../web/user-agent-tagger');
var loadTroupeFromParam = require('./load-troupe-param');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var RoomWithPolicyService = require('gitter-web-rooms/lib/room-with-policy-service');
const approvedBridgeClientAccessOnly = require('gitter-web-oauth/lib/approved-bridge-client-access-only');

function parseLookups(lookups) {
  // string of comma-delimited attributes passed in via req.query
  if (!lookups) {
    return undefined;
  }
  if (Array.isArray(lookups)) {
    return lookups;
  }
  return lookups.split(',');
}

function ensureRequestIsAllowedToUseVirtualUser(req, virtualUser) {
  if (
    virtualUser &&
    !approvedBridgeClientAccessOnly.isRequestFromApprovedBridgeClient(req, virtualUser)
  ) {
    throw new StatusError(
      403,
      `Only approved bridge OAuth clients can use virtualUser (type=${virtualUser.type})`
    );
  }
}

module.exports = {
  id: 'chatMessageId',
  // eslint-disable-next-line complexity
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
    var lean = req.query.lean === 'true';
    var lookups = parseLookups(req.query.lookups);
    const includeThreads = req.query.includeThreads === 'true';
    var options;

    var query;
    if (q) {
      options = {
        skip: parseInt(skip, 10) || 0,
        limit: parseInt(limit, 10) || 50,
        lang: lang,
        userId: userId
      };

      query = chatService.searchChatMessagesForRoom(troupeId, '' + q, options);
    } else {
      options = {
        skip: parseInt(skip, 10) || 0,
        limit: parseInt(limit, 10) || 50,
        beforeId: (beforeId && '' + beforeId) || undefined,
        afterId: (afterId && '' + afterId) || undefined,
        aroundId: (aroundId && '' + aroundId) || undefined,
        includeThreads,
        marker: (marker && '' + marker) || undefined,
        userId: userId
      };
      query = chatService.findChatMessagesForTroupe(troupeId, options);
    }

    return query.then(function(chatMessages) {
      var userId = req.user && req.user.id;
      var strategy = new restSerializer.ChatStrategy({
        currentUserId: userId,
        troupeId: troupeId,
        initialId: aroundId,
        lean,
        lookups
      });

      return restSerializer.serialize(chatMessages, strategy);
    });
  },

  create: asyncHandler(async function(req) {
    const troupe = await loadTroupeFromParam(req);
    var data = _.clone(req.body);
    data.stats = userAgentTagger(req);

    // message.virtualUser usage is for approved bridge clients only
    ensureRequestIsAllowedToUseVirtualUser(req, data.virtualUser);

    const roomWithPolicyService = new RoomWithPolicyService(troupe, req.user, req.userRoomPolicy);
    const chatMessage = await roomWithPolicyService.sendMessage(data);

    var strategy = new restSerializer.ChatStrategy({
      currentUserId: req.user.id,
      troupeId: req.params.troupeId
    });
    return restSerializer.serializeObject(chatMessage, strategy);
  }),

  show: function(req) {
    return chatService.findById(req.params.chatMessageId).then(function(chatMessage) {
      if (!chatMessage) throw new StatusError(404);
      if (!mongoUtils.objectIDsEqual(chatMessage.toTroupeId, req.params.troupeId))
        throw new StatusError(404);

      var strategy = new restSerializer.ChatIdStrategy({
        currentUserId: req.user.id,
        troupeId: req.params.troupeId
      });
      return restSerializer.serializeObject(req.params.chatMessageId, strategy);
    });
  },

  update: async function(req) {
    const [troupe, chatMessage] = await Promise.all([
      loadTroupeFromParam(req),
      chatService.findById(req.params.chatMessageId)
    ]);

    if (!chatMessage) throw new StatusError(404);

    // message.virtualUser usage is for approved bridge clients only
    ensureRequestIsAllowedToUseVirtualUser(req, chatMessage.virtualUser);

    const roomWithPolicyService = new RoomWithPolicyService(troupe, req.user, req.userRoomPolicy);
    const updatedMessage = await roomWithPolicyService.editMessage(chatMessage, req.body.text);

    var strategy = new restSerializer.ChatStrategy({
      currentUserId: req.user.id,
      troupeId: req.params.troupeId
    });
    return restSerializer.serializeObject(updatedMessage, strategy);
  },

  destroy: function(req, res) {
    return Promise.join(
      chatService.findById(req.params.chatMessageId),
      loadTroupeFromParam(req),
      function(chatMessage, troupe) {
        if (!chatMessage) throw new StatusError(404);

        var roomWithPolicyService = new RoomWithPolicyService(troupe, req.user, req.userRoomPolicy);
        return roomWithPolicyService.deleteMessageFromRoom(chatMessage);
      }
    ).then(function() {
      res.status(204);
      return null;
    });
  },

  subresources: {
    readBy: require('./chat-read-by'),
    report: require('./chat-message-report'),
    thread: require('./chat-messages-thread')
  }
};
