/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var _ = require("underscore");
var execPreloads = require('../exec-preloads');
var UserIdStrategy = require('./user-id-strategy');
var TroupeIdStrategy = require('./troupe-id-strategy');

function ChatStrategy(options)  {
  if(!options) options = {};

  var userStategy = new UserIdStrategy(options);
  var troupeStrategy = options.includeTroupe && new TroupeIdStrategy(options);

  this.preload = function(items, callback) {
    var users = items.map(function(i) { return i.fromUserId; });

    var strategies = [];
    strategies.push({
      strategy: userStategy,
      data: _.uniq(users)
    });

    if(troupeStrategy) {
      var troupeIds = items.map(function(i) { return i.toTroupeId; });
      strategies.push({
        strategy: troupeStrategy,
        data: troupeIds
      });
    }

    execPreloads(strategies, callback);
  };

  this.map = function(item) {
    return {
      id: item._id,
      text: item.text,
      html: item.html,
      sent: item.sent,
      mentions: item.mentions,
      fromUser: options.user ? options.user : userStategy.map(item.fromUserId),
      troupe: troupeStrategy && troupeStrategy.map(item.toTroupeId)
    };

  };
}

ChatStrategy.prototype = {
  name: 'ChatStrategy'
};

module.exports = ChatStrategy;
