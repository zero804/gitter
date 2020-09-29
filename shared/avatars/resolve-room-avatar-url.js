'use strict';

const avatars = require('gitter-web-avatars');
var resolveRoomAvatarSrcSet = require('./resolve-room-avatar-srcset');

module.exports = function(room, size) {
  if (room && room.groupId) {
    return avatars.getForGroupId(room.groupId);
  }

  var srcset = resolveRoomAvatarSrcSet(room, size);
  return srcset.src;
};
