"use strict";

var resolveAvatarSrcSet = require('gitter-web-shared/avatars/resolve-avatar-srcset');

module.exports = exports = function(template) {
  return function avatarWidgetHandler(params) {
    var hash = params.hash;
    var user = hash.model || hash.user || {};

    var avatarSize = hash.avatarSize || 's';
    var showStatus = hash.showStatus;
    var imgSize = avatarSize == 'm' ? 60 : 30;
    var avatarSrcSet = resolveAvatarSrcSet({ username: user.username, size: imgSize });

    var r = template({
      avatarSrcSet: avatarSrcSet,
      avatarSize: avatarSize,
      imgSize: imgSize,
      id: user.id,
      role: user.role,
      showStatus: showStatus,
      presenceClass: user.online ? 'online' : 'offline',
      inactive: user.invited
    });

    return r;
  };
};
