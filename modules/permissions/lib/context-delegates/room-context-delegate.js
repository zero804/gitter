'use strict';

var assert = require('assert');
var persistence = require('gitter-web-persistence');

function RoomContextDelegate(userId, roomId) {
  assert(userId, 'userId required');
  assert(roomId, 'roomId required');

  this.userId = userId;
  this.roomId = roomId;
}

RoomContextDelegate.prototype = {
  isMember: function() {
    return persistence.TroupeUser.count({ troupeId: this.roomId, userId: this.userId })
      .exec()
      .then(function(count) {
        return count > 0;
      });
  },
};

module.exports = RoomContextDelegate;
