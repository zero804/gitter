/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var resolveAvatarUrl = require('gitter-web-shared/avatars/resolve-avatar-url');

module.exports = exports = function(template) {
  return function avatarWidgetHandler(params) {
    var hash = params.hash;
    var user = hash.model || hash.user || {};

    var avatarSize = hash.avatarSize || 's';
    var showBadge = hash.showBadge;
    var showStatus = hash.showStatus;

    var avatarUrl = resolveAvatarUrl({ username: user.username, size: (avatarSize == 'm' ? 60 : 30) });

    var r = template({
      avatarUrl: avatarUrl,
      avatarSize: avatarSize,
      id: user.id,
      role: user.role,
      showStatus: showStatus,
      showBadge: showBadge,
      presenceClass: user.online ? 'online' : 'offline',
      inactive: user.invited
    });

    return r;
  };
};
