"use strict";

var roomMembershipService = require('../../../services/room-membership-service');
var collections = require('../../../utils/collections');

function RoomMembershipStrategy(options) {
  this.userId = options.userId || options.currentUserId;
  this.nonMemberTroupeIds = options.nonMemberTroupeIds && collections.hashArray(options.nonMemberTroupeIds);
  this.predefinedValue = options.isRoomMember !== undefined;
  this.isRoomMember = options.isRoomMember;
  this.memberships = null;
}

RoomMembershipStrategy.prototype = {
  preload: function(troupeIds) {
    // Shortcut logic
    if (this.nonMemberTroupeIds || this.predefinedValue) {
      return;
    }

    return roomMembershipService.findUserMembershipInRooms(this.userId, troupeIds.toArray())
      .bind(this)
      .then(function(memberTroupeIds) {
        this.memberships = collections.hashArray(memberTroupeIds);
      });
  },

  map: function(id) {
    if (this.predefinedValue) {
      return this.isRoomMember;
    }

    if (this.nonMemberTroupeIds) {
      return !this.nonMemberTroupeIds[id]; // Negate
    }

    return !!this.memberships[id];
  },

  name: 'AllUnreadItemCountStrategy'
};


module.exports = RoomMembershipStrategy;
