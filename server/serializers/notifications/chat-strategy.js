"use strict";

var UserIdStrategy = require('./user-id-strategy');
var TroupeIdStrategy = require('./troupe-id-strategy');
var Promise = require('bluebird');

function ChatStrategy(options)  {
  if(!options) options = {};

  var userStategy = new UserIdStrategy(options);
  var troupeStrategy = options.includeTroupe && new TroupeIdStrategy(options);

  this.preload = function(items) {
    var users = items.map(function(i) { return i.fromUserId; });

    var strategies = [
      userStategy.preload(users)
    ];

    if(troupeStrategy) {
      var troupeIds = items.map(function(i) { return i.toTroupeId; });
      strategies.push(troupeStrategy.preload(troupeIds));
    }

    return Promise.all(strategies);
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
