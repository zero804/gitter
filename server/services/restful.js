/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var troupeService       = require("./troupe-service");

var restSerializer      = require("../serializers/rest-serializer");
var unreadItemService   = require("./unread-item-service");
var chatService         = require("./chat-service");
var userService         = require("./user-service");
var eventService        = require("./event-service");
var Q                   = require('q');
var roomService         = require('./room-service');
var GithubMe            = require('./github/github-me-service');
var isUserLurkingInRoom = require('./is-user-lurking-in-room');
var _                   = require('underscore');


var DEFAULT_CHAT_COUNT_LIMIT = 30;

exports.serializeTroupesForUser = function(userId, callback) {
  if(!userId) return Q.resolve([]);

  return roomService.findAllRoomsIdsForUserIncludingMentions(userId)
    .then(function(troupeIds) {
      var strategy = new restSerializer.TroupeIdStrategy({
        currentUserId: userId,
        mapUsers: false
      });

      return restSerializer.serializeExcludeNulls(troupeIds, strategy);
    })
    .nodeify(callback);
};

exports.serializeChatsForTroupe = function(troupeId, userId, options, callback) {
  options = _.extend({}, {
    skip: 0,
    limit: DEFAULT_CHAT_COUNT_LIMIT,
    userId: userId // This may also be appearing through in options
  }, options);

  var initialId = options.aroundId;

  return chatService.findChatMessagesForTroupe(troupeId, options)
    .spread(function(chatMessages, limitReached) {
      var strategy = new restSerializer.ChatStrategy({
        notLoggedIn: !userId,
        initialId: initialId,
        currentUserId: userId,
        troupeId: troupeId,
        limitReached: limitReached,
        unread: options.unread,
        disableLimitReachedMessage: options.disableLimitReachedMessage
      });

      return restSerializer.serializeExcludeNulls(chatMessages, strategy);
    })
    .nodeify(callback);

};

exports.serializeUsersForTroupe = function(troupeId, userId, options, callback) {
  return troupeService.findUserIdsForTroupe(troupeId)
    .then(function (userIds) {

      var strategy = new restSerializer.UserIdStrategy({
        showPresenceForTroupeId: troupeId,
        includeRolesForTroupeId: troupeId,
        currentUserId: userId,
        lean: !!options.lean
      });

      return restSerializer.serializeExcludeNulls(userIds, strategy);
    })
    .nodeify(callback);
};

exports.serializeUnreadItemsForTroupe = function(troupeId, userId, callback) {
  return Q.all([
      isUserLurkingInRoom(userId, troupeId),
      unreadItemService.getUnreadItemsForUser(userId, troupeId)
    ])
    .spread(function(isLurking, items) {
      if(isLurking) {
        items._meta = { lurk: true };
      }
      return items;
    })
    .nodeify(callback);
};

exports.serializeReadBysForChat = function(troupeId, chatId, callback) {
  return chatService.findById(chatId)
    .then(function(chatMessage) {
      var strategy = new restSerializer.UserIdStrategy({});

      return restSerializer.serializeExcludeNulls(chatMessage.readBy, strategy);
    })
    .nodeify(callback);

};

exports.serializeEventsForTroupe = function(troupeId, userId, callback) {
  return eventService.findEventsForTroupe(troupeId, {})
    .then(function(events) {
      var strategy = new restSerializer.EventStrategy({ currentUserId: userId, troupeId: troupeId });
      return restSerializer.serializeExcludeNulls(events, strategy);
    })
    .nodeify(callback);
};

exports.serializeOrgsForUser = function(user, options) {
  var ghUser = new GithubMe(user);

  var strategyOptions = { currentUserId: user.id, mapUsers: options && options.mapUsers };

  return ghUser.getOrgs()
    .then(function(ghOrgs) {
      var strategy = new restSerializer.GithubOrgStrategy(strategyOptions);

      return restSerializer.serializeExcludeNulls(ghOrgs, strategy);
    });
};

exports.serializeOrgsForUserId = function(userId, options) {
  return userService.findById(userId)
    .then(function(user) {
      if(!user) return [];

      return exports.serializeOrgsForUser(user, options);
    });
};
