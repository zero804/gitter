/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var UserIdStrategy    = require('./user-id-strategy');

function TroupeBanStrategy(options) {
  var userIdStategy = new UserIdStrategy(options);

  this.preload = function(troupeBans, callback) {
    var userIds = troupeBans.map(function(troupeBan) { return troupeBan.userId; });
    var banningUsers = troupeBans.map(function(troupeBan) { return troupeBan.bannedBy; });

    userIdStategy.preload(userIds.concat(banningUsers), callback);
  };

  this.map = function(troupeBan) {
    var user = userIdStategy.map(troupeBan.userId);
    var bannedBy = userIdStategy.map(troupeBan.bannedBy);

    if(!user) return null;
    return {
      user: user,
      bannedBy: bannedBy,
      dateBanned: troupeBan.dateBanned
    };
  };
}
TroupeBanStrategy.prototype = {
  name: 'TroupeBanStrategy'
};


module.exports = TroupeBanStrategy;
