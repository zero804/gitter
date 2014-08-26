/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var execPreloads      = require('../exec-preloads');
var getVersion        = require('../get-model-version');
var TroupeIdStrategy = require('./troupe-strategy');
var UserIdStrategy = require('./user-id-strategy');

function formatDate(d) {
  return d ? d.toISOString() : null;
}

function EventStrategy(options) {
  if(!options) options = {};

  var userStategy = options.user ? null : new UserIdStrategy();
  var troupeStrategy = options.includeTroupe ? new TroupeIdStrategy(options) : null;

  this.preload = function(items, callback) {
    var users = items.map(function(i) { return i.fromUserId; });

    var strategies = [];

    // If the user is fixed in options, we don't need to look them up using a strategy...
    if(userStategy) {
      strategies.push({
        strategy: userStategy,
        data: users
      });
    }

    if(troupeStrategy) {
      strategies.push({
        strategy: troupeStrategy,
        data: items.map(function(i) { return i.toTroupeId; })
      });
    }

    execPreloads(strategies, callback);
  };

  this.map = function(item) {
    var prerendered = item.meta && item.meta.prerendered;

    return {
      id: item._id,
      text: item.text,
      html: item.html,
      sent: formatDate(item.sent),
      editedAt: formatDate(item.editedAt),
      fromUser: options.user ? options.user : userStategy.map(item.fromUserId),
      troupe: troupeStrategy ? troupeStrategy.map(item.toTroupeId) : undefined,
      meta: item.meta || {},
      payload: prerendered ? undefined : item.payload,
      v: getVersion(item)
    };

  };
}

EventStrategy.prototype = {
  name: 'EventStrategy'
};


module.exports = EventStrategy;
