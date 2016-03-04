"use strict";

var Promise          = require('bluebird');
var getVersion       = require('../get-model-version');
var TroupeIdStrategy = require('./troupe-strategy');
var UserIdStrategy   = require('./user-id-strategy');

function formatDate(d) {
  return d ? d.toISOString() : null;
}

function EventStrategy(options) {
  if(!options) options = {};

  var userStategy = options.user ? null : new UserIdStrategy();
  var troupeStrategy = options.includeTroupe ? new TroupeIdStrategy(options) : null;

  this.preload = function(items) {
    var strategies = [];

    // If the user is fixed in options, we don't need to look them up using a strategy...
    if(userStategy) {
      var userIds = items.map(function(i) { return i.fromUserId; });
      strategies.push(userStategy.preload(userIds));
    }

    if(troupeStrategy) {
      var troupeIds = items.map(function(i) { return i.toTroupeId; });
      strategies.push(troupeStrategy.preload(troupeIds));
    }

    return Promise.all(strategies);
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
