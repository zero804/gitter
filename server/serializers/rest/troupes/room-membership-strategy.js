"use strict";

var roomMembershipService = require('../../../services/room-membership-service');
var collections = require('../../../utils/collections');

function RoomMembershipStrategy(options) {
  var userId = options.userId || options.currentUserId;
  var nonMemberTroupeIds = options.nonMemberTroupeIds && collections.hashArray(options.nonMemberTroupeIds);
  var predefinedValue = options.isRoomMember !== undefined;
  var memberships;

  this.preload = function(troupeIds) {
    // Shortcut logic
    if (nonMemberTroupeIds || predefinedValue) {
      return;
    }

    return roomMembershipService.findUserMembershipInRooms(userId, troupeIds.toArray())
      .then(function(memberTroupeIds) {
        memberships = collections.hashArray(memberTroupeIds);
      });
  };

  this.map = function(id) {
    if (predefinedValue) {
      return options.isRoomMember;
    }

    if (nonMemberTroupeIds) {
      return !nonMemberTroupeIds[id]; // Negate
    }

    return !!memberships[id];
  };
}

RoomMembershipStrategy.prototype = {
  name: 'AllUnreadItemCountStrategy'
};


module.exports = RoomMembershipStrategy;
