/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

module.exports = exports = function(template) {
  return function avatarWidgetHandler(params) {
    var hash = params.hash;
    var user = hash.model || hash.user;

    var avatarSize = hash.avatarSize || 's';
    var showBadge = hash.showBadge;
    var showStatus = hash.showStatus;

    var avatarUrl;
    if (avatarSize == 'm') {
      avatarUrl = user.avatarUrlMedium || '/images/2/avatar-default-m.png';
    } else {
      avatarUrl = user.avatarUrlSmall || '/images/2/avatar-default-s.png';
    }

    var r = template({
      avatarUrl: avatarUrl,
      avatarSize: avatarSize,
      id: user.id,
      showStatus: showStatus,
      showBadge: showBadge
    });

    return r;
  };
};
