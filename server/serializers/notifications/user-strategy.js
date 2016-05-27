"use strict";

var resolveUserAvatarUrl = require('gitter-web-shared/avatars/resolve-user-avatar-url');

function UserStrategy(options) {
  options = options ? options : {};

  this.preload = function() { };

  this.map = function(user) {
    if(!user) return null;

    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName || user.username,
      avatarUrlSmall: resolveUserAvatarUrl(user, 60),
      avatarUrlMedium: resolveUserAvatarUrl(user, 128)
    };
  };
}

UserStrategy.prototype = {
  name: 'UserStrategy'
};

module.exports = UserStrategy;
