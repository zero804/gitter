'use strict';

var _                     = require('lodash');
var Promise               = require('bluebird');
var appEvents             = require('gitter-web-appevents');
var restSerializer        = require("../../serializers/rest-serializer");
var roomMembershipService = require('../room-membership-service');

function getRoomDistribution(userId) {
  return roomMembershipService.findRoomIdsForUser(userId);
}

function serializeUserToRooms(troupeIds, operation, user) {
  if (!troupeIds.length) return Promise.resolve();
  var strategy = new restSerializer.UserStrategy();

  return restSerializer.serializeObject(user, strategy)
    .then(function(serializedUser) {

      troupeIds.forEach(function(troupeId) {
        var url = "/rooms/" + troupeId + "/users";
        appEvents.dataChange2(url, "update", serializedUser, 'user');
      });

    });
}

module.exports = {
  create: function(user) {
    return getRoomDistribution(user._id)
      .then(function(troupeIds) {
        return serializeUserToRooms(troupeIds, "create", user);
      });
  },

  update: function(user) {
    return getRoomDistribution(user._id)
      .then(function(troupeIds) {
        if (!troupeIds.length) return;

        return serializeUserToRooms(troupeIds, "update", user);
      });
  },

  patch: function(userId, patch) {
    return getRoomDistribution(userId)
      .then(function(troupeIds) {
        if (!troupeIds.length) return;

        var patchMessage = _.extend({ }, patch, { id: userId });

        troupeIds.forEach(function(troupeId) {
          var url = "/rooms/" + troupeId + "/users";
          appEvents.dataChange2(url, "patch", patchMessage, 'user');
        });
      });
  },

  remove: function(/*userId*/) {
    // Not yet implemented
    return Promise.resolve();
  },

  removeId: function(/*userId*/) {
    // Not yet implemented
    return Promise.resolve();
  }
};
