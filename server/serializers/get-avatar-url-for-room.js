'use strict';

var avatars = require('gitter-web-avatars');

function getAvatarUrlForRoom(room, options) {
  if (room.oneToOne && options && options.user) {
    return avatars.getForUser(options.user);
  }
  else if(room.oneToOne && (!options || !options.user)) {
    return avatars.getForRoomUri(options.name);
  }
  else if (options && options.group) {
    return options.group.avatarUrl || avatars.getForGroup(options.group);
  }
  else {
    return avatars.getForRoomUri(room.uri);
  }
}

module.exports = getAvatarUrlForRoom;
