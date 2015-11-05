'use strict';

var resolveRoomAvatarSrcSet = require('./resolve-room-avatar-srcset');

module.exports = function (url, size) {
  var srcset = resolveRoomAvatarSrcSet(url, size);
  return srcset.src;
};
