/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

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
      displayName: user.getDisplayName()
    };
  };
}

UserStrategy.prototype = {
  name: 'UserStrategy'
};

module.exports = UserStrategy;
