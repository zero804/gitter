"use strict";

var unreadItemService     = require('../../../services/unread-items');
var roomMembershipService = require('../../../services/room-membership-service');
var _                     = require("lodash");

function LurkAndActivityForUserStrategy(options) {
  var currentUserId = options.currentUserId;
  var roomsWithLurk;
  var activity;

  this.preload = function() {
    return roomMembershipService.findLurkingRoomIdsForUserId(currentUserId)
      .then(function(troupeIds) {
        // Map the lurkers
        roomsWithLurk = _.reduce(troupeIds, function(memo, troupeId) {
          memo[troupeId] = true;
          return memo;
        }, {});

        // Map the activity indicators
        return unreadItemService.getActivityIndicatorForTroupeIds(troupeIds, currentUserId);
      })
      .then(function(values) {
        activity = values;
      });
  };

  this.mapLurkStatus = function(roomId) {
    return roomsWithLurk[roomId] || false;
  };

  this.mapActivity = function(roomId) {
    return activity[roomId];
  };
}

LurkAndActivityForUserStrategy.prototype = {
  name: 'LurkAndActivityForUserStrategy'
};

module.exports = LurkAndActivityForUserStrategy;
