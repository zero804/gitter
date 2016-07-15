'use strict';

var assert = require('assert');
var TroupeInvite = require('gitter-web-persistence').TroupeInvite;

/**
 * This context uses an invite to determine whether a user
 * can access a room
 */
function RoomInviteContextDelegate(userId, roomId, secret) {
  assert(userId, 'userId required');
  assert(roomId, 'roomId required');
  assert(secret, 'secret required');

  this.userId = userId;
  this.roomId = roomId;
  this.secret = secret;
}

RoomInviteContextDelegate.prototype = {
  isMember: function() {
    return TroupeInvite.count({
        troupeId: this.roomId,
        secret: this.secret,
        $or: [{
          userId: null,
          state: 'PENDING'
        }, {
          userId: this.userId,
          state: { $in: ['PENDING', 'REJECTED'] }
        }]
      })
      .exec()
      .then(function(count) {
        return count > 0;
      });
  },
};

module.exports = RoomInviteContextDelegate;
