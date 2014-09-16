/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var unreadItemService = require("../../services/unread-item-service");
var collapsedChatsService = require('../../services/collapsed-chats-service');
var execPreloads      = require('../exec-preloads');
var getVersion        = require('../get-model-version');
var UserIdStrategy    = require('./user-id-strategy');
var TroupeIdStrategy  = require('./troupe-id-strategy');

var LIMIT_REACHED_MESSAGE = "You have more messages in your history. Upgrade your plan to see them";

function formatDate(d) {
  return d ? d.toISOString() : null;
}

function UnreadItemStategy(options) {
  var itemType = options.itemType;
  var unreadItemsHash;

  this.preload = function(data, callback) {
    unreadItemService.getUnreadItems(data.userId, data.troupeId, itemType, function(err, ids) {
      if(err) return callback(err);

      var hash = {};
      ids.forEach(function(id) {
        hash[id] = true;
      });

      unreadItemsHash = hash;
      callback(null);
    });
  };

  this.map = function(id) {
    return !!unreadItemsHash[id];
  };
}

UnreadItemStategy.prototype = {
  name: 'UnreadItemStategy'
};



function CollapsedItemStrategy(options) {
  var itemsHash;
  var userId = options.userId;
  var roomId = options.roomId;

  this.preload = function(data, callback) {
    collapsedChatsService.getHash(userId, roomId)
      .then(function (hash) {
        itemsHash = hash;
      })
      .nodeify(callback);
  };

  this.map = function (chatId) {
    return itemsHash[chatId] ? true : undefined; // Don't send false,
  };
}

CollapsedItemStrategy.prototype = {
  name: 'CollapsedItemStrategy'
};

function ChatStrategy(options)  {
  if(!options) options = {};

  var userStategy = options.user ? null : new UserIdStrategy();
  var unreadItemStategy, collapsedItemStategy;
  /* If options.unread has been set, we don't need a strategy */
  if(options.currentUserId && options.unread === undefined) {
    unreadItemStategy = new UnreadItemStategy({ itemType: 'chat' });
  }

  if (options.currentUserId && options.troupeId) {
    collapsedItemStategy = new CollapsedItemStrategy({ userId: options.currentUserId, roomId: options.troupeId });
  }

  var troupeStrategy = options.includeTroupe ? new TroupeIdStrategy(options) : null;
  var defaultUnreadStatus = options.unread === undefined ? true : !!options.unread;

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

    if(collapsedItemStategy) {
      strategies.push({
        strategy: collapsedItemStategy,
        data: null
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
    var unread = unreadItemStategy ? unreadItemStategy.map(item._id) : defaultUnreadStatus;
    var collapsed = collapsedItemStategy && collapsedItemStategy.map(item._id);

    return {
      id: item._id,
      text: item.text,
      status: item.status,
      html: item.html,
      sent: formatDate(item.sent),
      editedAt: formatDate(item.editedAt),
      fromUser: options.user ? options.user : userStategy.map(item.fromUserId),
      unread: unread,
      collapsed: collapsed,
      room: troupeStrategy ? troupeStrategy.map(item.toTroupeId) : undefined,
      readBy: item.readBy ? item.readBy.length : undefined,
      urls: item.urls || [],
      initial: options.initialId && item._id == options.initialId || undefined,
      mentions: item.mentions ? item.mentions.map(function(m) {
          return {
            screenName: m.screenName,
            userId: m.userId,
            group: m.group
          };
        }) : [],
      issues: item.issues || [],
      meta: item.meta || {},
      v: getVersion(item)
    };

  };

  if(options.limitReached && !options.disableLimitReachedMessage) {
    this.post = function(serialized) {
      // Push a fake message
      serialized.unshift({
        limitReached: true,
        text: LIMIT_REACHED_MESSAGE,
        html: LIMIT_REACHED_MESSAGE
      });

      return serialized;
    };
  }
}

ChatStrategy.prototype = {
  name: 'ChatStrategy'
};

module.exports = ChatStrategy;
