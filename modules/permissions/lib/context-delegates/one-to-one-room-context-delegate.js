'use strict';

var assert = require('assert');
var persistence = require('gitter-web-persistence');

function OneToOneRoomContextDelegate(userId, roomId) {
  assert(userId, 'userId required');
  assert(roomId, 'roomId required');

  this.userId = userId;
  this.roomId = roomId;
}

OneToOneRoomContextDelegate.prototype = {
  isMember: function() {
    return persistence.Troupe.count({ _id: this.roomId, 'oneToOneUsers.userId': this.userId })
      .exec()
      .then(function(count) {
        return count > 0;
      });
  },
};

module.exports = OneToOneRoomContextDelegate;
