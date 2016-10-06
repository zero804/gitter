"use strict";

var groupAvatars = require('gitter-web-groups/lib/group-avatars');

module.exports = function(groupId, size, isVersioned) {
  return groupAvatars.getAvatarUrlForGroupId(groupId, size)
    .bind({
      isVersioned: isVersioned
    })
    .then(function(avatarUrl) {
      if (!avatarUrl) return null;

      return {
        url: avatarUrl,
        longTermCachable: !!this.isVersioned
      };
    });
}
