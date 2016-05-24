"use strict";

var resolveRoomAvatarUrl = require('gitter-web-shared/avatars/resolve-room-avatar-url');

function GroupStrategy(/*options*/)  {
}

GroupStrategy.prototype = {
  name: 'GroupStrategy',

  preload: function(/*groups*/) {
    return;
  },

  map: function(group) {
    return {
      id: group.id || group._id && group._id.toHexString(),
      name: group.name,
      uri: group.uri,
      // for now just assume it is a GitHub org/user
      avatarUrl: resolveRoomAvatarUrl({ uri: group.uri }, 48)
    };
  }
};

module.exports = GroupStrategy;
