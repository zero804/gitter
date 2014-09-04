/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

function setAvatarSize(url, size) {
  var sizeText;
  if(!url || typeof url !== "string") return null;
  if(size=='m') sizeText="s=128";
  if(size=='s') sizeText="s=60";

  if(url.indexOf('?') >= 0) {
    return url + '&' + sizeText;
  }

  return url + '?' + sizeText;
}

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
      avatarUrlSmall: setAvatarSize(user.gravatarImageUrl,'s'),
      avatarUrlMedium: setAvatarSize(user.gravatarImageUrl,'m'),
    };
  };
}

UserStrategy.prototype = {
  name: 'UserStrategy'
};

module.exports = UserStrategy;
