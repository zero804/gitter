'use strict';

var persistence = require('gitter-web-persistence');

function OneToOneRoomContextDelegate(roomId) {
  this.roomId = roomId;
}

OneToOneRoomContextDelegate.prototype = {
  isMember: function(userId) {
    return persistence.Troupe.count({ _id: this.roomId, 'oneToOneUsers.userId': userId })
      .exec()
      .then(function(count) {
        return count > 0;
      });
  },
};

module.exports = OneToOneRoomContextDelegate;
