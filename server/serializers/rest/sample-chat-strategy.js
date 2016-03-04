"use strict";

var Promise = require('bluebird');
var TroupeIdStrategy = require('./troupe-id-strategy');
var UserIdStrategy = require('./user-id-strategy');

function SampleChatStrategy() {
  // TODO: simple strategy
  var userStategy = new UserIdStrategy();
  var troupeStategy = new TroupeIdStrategy();

  this.preload = function(items) {
    var userIds = items.map(function(i) { return i.fromUserId; });
    var troupeIds = items.map(function(i) { return i.toTroupeId; });

    return Promise.join(
      userStategy.preload(userIds),
      troupeStategy.preload(troupeIds));
  };

  this.map = function(item) {
    var user = userStategy.map(item.fromUserId);
    var troupe = troupeStategy.map(item.toTroupeId);

    if(!user || !troupe || !troupe.uri) return;
    return {
      avatarUrl: user.avatarUrlSmall,
      username: user.username,
      room: troupe.uri
    };

  };
}

SampleChatStrategy.prototype = {
  name: 'SampleChatStrategy'
};


module.exports = SampleChatStrategy;
