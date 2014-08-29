/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var execPreloads      = require('../exec-preloads');
var TroupeIdStrategy = require('./troupe-id-strategy');
var UserIdStrategy = require('./user-id-strategy');

function SampleChatStrategy() {
  // TODO: simple strategy
  var userStategy = new UserIdStrategy();
  var troupeStategy = new TroupeIdStrategy();

  this.preload = function(items, callback) {
    var userIds = items.map(function(i) { return i.fromUserId; });
    var troupeIds = items.map(function(i) { return i.toTroupeId; });

    var strategies = [{
      strategy: userStategy,
      data: userIds
    }, {
      strategy: troupeStategy,
      data: troupeIds
    }];

    execPreloads(strategies, callback);
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
