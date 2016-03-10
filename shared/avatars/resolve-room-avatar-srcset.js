'use strict';

var resolveUserAvatarSrcSet = require('./resolve-user-avatar-srcset');

module.exports = function resolveRoomAvatarSrcSet(name, size) {
  // this is only supporting room.uri for now. Not sure if room.user or
  // room.owner or something would make more sense in future?
  size = size || 48;

  var leadingSlash = (name[0] === '/');
  var base         = name.split('/')[leadingSlash ? 1 : 0];
  if (base) {
    // treat the first path component as a username just like before
    return resolveUserAvatarSrcSet({ username: base }, size);
  }

  // default: just return resolveUserAvatarSrcSet's default
  return resolveUserAvatarSrcSet({}, size);
}

