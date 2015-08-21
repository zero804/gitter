/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var Q              = require('q');
var appEvents      = require('gitter-web-appevents');
var restSerializer = require("../../serializers/rest-serializer");
var roomMembershipService = require('../room-membership-service');
var presenceService = require('gitter-web-presence');
var _              = require('underscore');

function getUserDistribution(troupeId) {
  return roomMembershipService.findMembersForRoom(troupeId)
    .then(function(userIds) {
      if (!userIds.length) return [];

      return presenceService.categorizeUsersByOnlineStatus(userIds)
        .then(function(online) {
          return userIds.filter(function(userId) {
              return !!online[userId];
            });
        });
    });
}

function serializeRoomToUsers(userIds, operation, troupe) {
  if (!userIds.length) return Q.resolve();

  if(troupe.oneToOne) {
    // Because the troupe needs customized per-user....
    serializeOneToOneRoomToUsers(userIds, operation, troupe);
    return;
  }

  return restSerializer.serializeModel(troupe)
    .then(function(serializedTroupe) {
      appEvents.dataChange2('/rooms/' + troupe._id, operation, serializedTroupe);

      userIds.forEach(function(userId) {
        appEvents.dataChange2('/user/' + userId + '/rooms', operation, serializedTroupe);
      });

    });
}

/* Note: oneToOnes do not serialize to /rooms/:roomId since each user gets a different representation */
function serializeOneToOneRoomToUsers(userIds, operation, troupe) {
  /* Perform the serialization for each user */

  return Q.all(userIds.map(function(userId) {
    var strategy = new restSerializer.TroupeStrategy({ currentUserId: userId });

    return restSerializer.serialize(troupe, strategy)
      .then(function(serializedTroupe) {
        appEvents.dataChange2('/user/' + userId + '/rooms', operation, serializedTroupe);
      });
  }));
}


module.exports = {
  create: function(troupe, initialUserIds) {

    /* initialUserIds is used when the room has just been created  */
    /* and we know who the users in the room are                   */
    if (initialUserIds) {
      return serializeRoomToUsers(initialUserIds, "create", troupe);
    }

    return getUserDistribution(troupe._id)
      .then(function(userIds) {
        return serializeRoomToUsers(userIds, "create", troupe);
      });
  },

  update: function(troupe) {
    return getUserDistribution(troupe._id)
      .then(function(userIds) {
        return serializeRoomToUsers(userIds, "update", troupe);
      });
  },

  patch: function(troupeId, patch) {
    var patchMessage = _.extend({ }, patch, { id: troupeId });
    appEvents.dataChange2('/rooms/' + troupeId, "patch", patchMessage);

    return getUserDistribution(troupeId)
      .then(function(userIds) {
        if (!userIds.length) return;

        userIds.forEach(function(userId) {
          var url = '/user/' + userId + '/rooms';
          appEvents.dataChange2(url, "patch", patchMessage);
        });
      });
  },

  remove: function(model) {
    return this.removeId(model.id);
  },

  removeId: function(troupeId) {
    appEvents.dataChange2('/rooms/' + troupeId, "remove", { id: troupeId });

    return getUserDistribution(troupeId)
      .then(function(userIds) {
        if (!userIds.length) return;

        userIds.forEach(function(userId) {
          var url = '/user/' + userId + '/rooms';
          appEvents.dataChange2(url, "remove", { id: troupeId });
        });
      });
  }
};
