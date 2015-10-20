"use strict";

var getUserAvatarForSize = require('gitter-web-shared/avatars/get-user-avatar-for-size');

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
      avatarUrlSmall: getUserAvatarForSize(user, 60),
      avatarUrlMedium: getUserAvatarForSize(user, 128)
    };
  };
}

UserStrategy.prototype = {
  name: 'UserStrategy'
};

module.exports = UserStrategy;
