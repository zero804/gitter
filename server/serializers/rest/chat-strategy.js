/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var unreadItemService = require("../../services/unread-item-service");
var execPreloads      = require('../exec-preloads');
var getVersion        = require('../get-model-version');
var UserIdStrategy    = require('./user-id-strategy');
var TroupeIdStrategy  = require('./troupe-id-strategy');

function formatDate(d) {
  return d ? d.toISOString() : null;
}

function UnreadItemStategy(options) {
  var self = this;
  var itemType = options.itemType;

  this.preload = function(data, callback) {
    unreadItemService.getUnreadItems(data.userId, data.troupeId, itemType, function(err, ids) {
      if(err) return callback(err);

      var hash = {};
      ids.forEach(function(id) {
        hash[id] = true;
      });

      self.unreadIds = hash;
      callback(null);
    });
  };

  this.map = function(id) {
    return !!self.unreadIds[id];
  };
}


function ChatStrategy(options)  {
  if(!options) options = {};

  var userStategy = options.user ? null : new UserIdStrategy();
  var unreadItemStategy;
  /* If options.unread has been set, we don't need a strategy */
  if(options.currentUserId && typeof options.unread === 'undefined') {
    unreadItemStategy = new UnreadItemStategy({ itemType: 'chat' });    
  }
  
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

    if(unreadItemStategy) {
      strategies.push({
        strategy: unreadItemStategy,
        data: { userId: options.currentUserId, troupeId: options.troupeId }
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
    var unread;
    
    if(unreadItemStategy) {
      unread = unreadItemStategy.map(item._id);
    } else {
      /* We're not looking up the unread items, but clients can request the state */
      unread = typeof options.unread !== 'undefined' ? options.unread : true; /* defaults to true */
    }
    
    
    return {
      id: item._id,
      text: item.text,
      status: item.status,
      html: item.html,
      sent: formatDate(item.sent),
      editedAt: formatDate(item.editedAt),
      fromUser: options.user ? options.user : userStategy.map(item.fromUserId),
      unread: unread,
      room: troupeStrategy ? troupeStrategy.map(item.toTroupeId) : undefined,
      readBy: item.readBy ? item.readBy.length : undefined,
      urls: item.urls || [],
      initial: options.initialId && item._id == options.initialId || undefined,
      mentions: item.mentions ? item.mentions.map(function(m) {
          return {
            screenName: m.screenName,
            userId: m.userId
          };
        }) : [],
      issues: item.issues || [],
      meta: item.meta || {},
      v: getVersion(item)
    };

  };
}

module.exports = ChatStrategy;
