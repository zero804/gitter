"use strict";

var resolveAvatarUrl  = require('../../../shared/avatars/resolve-avatar-url');

function UserStrategy(options) {
  options = options ? options : {};

  this.preload = function(users, callback) {
    callback(null, true);
  };

  this.map = function(user) {
    if(!user) return null;

    return {
      id: user.id,
      username: user.username,
      displayName: user.getDisplayName(),
      avatarUrlSmall: resolveAvatarUrl({ username: user.username, version: user.gravatarVersion, size: 60 }),
      avatarUrlMedium: resolveAvatarUrl({ username: user.username, version: user.gravatarVersion, size: 128 })
    };
  };
}

UserStrategy.prototype = {
  name: 'UserStrategy'
};

module.exports = UserStrategy;
