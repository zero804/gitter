'use strict';

var persistence = require('gitter-web-persistence');

function RoomContextDelegate(roomId) {
  this.roomId = roomId;
}

RoomContextDelegate.prototype = {
  isMember: function(userId) {
    return persistence.TroupeUser.count({ troupeId: this.roomId, userId: userId })
      .exec()
      .then(function(count) {
        return count > 0;
      });
  },
};

module.exports = RoomContextDelegate;
