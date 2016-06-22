"use strict";
var _ = require('lodash');
var resolveRoomAvatar = require('gitter-web-shared/avatars/resolve-room-avatar-srcset');

module.exports = function mapGroupsForRenderer(groups) {
  return groups.map(function(group){
    return _.extend({}, group, {
      avatarSrcset: resolveRoomAvatar({ uri: group.name }),
    });
  });
};
