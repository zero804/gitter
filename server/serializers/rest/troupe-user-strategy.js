"use strict";

var UserIdStrategy = require('./user-id-strategy');

function TroupeUserStrategy(options) {
  var userIdStategy = new UserIdStrategy(options);

  this.preload = function(troupeUsers) {
    var userIds = troupeUsers.map(function(troupeUser) { return troupeUser.userId; });
    return userIdStategy.preload(userIds);
  };

  this.map = function(troupeUser) {
    return userIdStategy.map(troupeUser.userId);
  };
}

TroupeUserStrategy.prototype = {
  name: 'TroupeUserStrategy'
};

module.exports = TroupeUserStrategy;
