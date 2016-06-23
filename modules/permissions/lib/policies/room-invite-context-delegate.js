'use strict';

var TroupeInvite = require('gitter-web-persistence').TroupeInvite;

/**
 * This context uses an invite to determine whether a user
 * can access a room
 */
function RoomInviteContextDelegate(roomId, secret) {
  this.roomId = roomId;
  this.secret = secret;
}

RoomInviteContextDelegate.prototype = {
  isMember: function(userId) {
    return TroupeInvite.count({
        troupeId: this.roomId,
        secret: this.secret,
        $or: [{
          userId: null,
        }, {
          userId: userId
        }]
      })
      .exec()
      .then(function(count) {
        return count > 0;
      });
  },
};

module.exports = RoomInviteContextDelegate;
