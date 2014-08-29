/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var UserIdStrategy = require('./user-id-strategy');

function TroupeUserStrategy(options) {
  var userIdStategy = new UserIdStrategy(options);

  this.preload = function(troupeUsers, callback) {
    var userIds = troupeUsers.map(function(troupeUser) { return troupeUser.userId; });
    userIdStategy.preload(userIds, callback);
  };

  this.map = function(troupeUser) {
    return userIdStategy.map(troupeUser.userId);
  };
}
TroupeUserStrategy.prototype = {
  name: 'TroupeUserStrategy'
};

module.exports = TroupeUserStrategy;
