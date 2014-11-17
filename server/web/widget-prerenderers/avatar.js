/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var resolveAvatarUrl = require('../../../public/js/utils/resolve-avatar-url');

module.exports = exports = function(template) {
  return function avatarWidgetHandler(params) {
    var hash = params.hash;
    var user = hash.model || hash.user;

    var avatarSize = hash.avatarSize || 's';
    var showBadge = hash.showBadge;
    var showStatus = hash.showStatus;

    var avatarUrl = resolveAvatarUrl({ username: user.username, size: (avatarSize == 'm' ? 60 : 30) });

    var r = template({
      avatarUrl: avatarUrl,
      avatarSize: avatarSize,
      id: user.id,
      showStatus: showStatus,
      showBadge: showBadge,
      inactive: !!user.state
    });

    return r;
  };
};
