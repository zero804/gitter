'use strict';

var UserIdStrategy = require('./user-id-strategy');

function TroupeBanStrategy(options) {
  var userIdStategy = new UserIdStrategy(options);

  this.preload = function(troupeBans) {
    var userIds = troupeBans.map(function(troupeBan) {
      return troupeBan.userId;
    });
    var banningUsers = troupeBans.map(function(troupeBan) {
      return troupeBan.bannedBy;
    });

    return userIdStategy.preload(userIds.concat(banningUsers));
  };

  this.map = function(troupeBan) {
    var bannedBy = userIdStategy.map(troupeBan.bannedBy);

    const serializedData = {
      bannedBy: bannedBy,
      dateBanned: troupeBan.dateBanned
    };

    if (troupeBan.userId) {
      const user = userIdStategy.map(troupeBan.userId);
      serializedData.user = user;
    }

    if (troupeBan.virtualUser) {
      serializedData.virtualUser = {
        type: troupeBan.virtualUser.type,
        externalId: troupeBan.virtualUser.externalId
      };
    }

    return serializedData;
  };
}
TroupeBanStrategy.prototype = {
  name: 'TroupeBanStrategy'
};

module.exports = TroupeBanStrategy;
