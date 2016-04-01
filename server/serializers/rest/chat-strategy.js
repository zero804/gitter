"use strict";

var _                     = require('lodash');
var unreadItemService     = require("../../services/unread-items");
var collapsedChatsService = require('../../services/collapsed-chats-service');
var execPreloads          = require('../exec-preloads');
var getVersion            = require('../get-model-version');
var UserIdStrategy        = require('./user-id-strategy');
var TroupeIdStrategy      = require('./troupe-id-strategy');

function formatDate(d) {
  return d ? d.toISOString() : null;
}

function UnreadItemStategy() {
  var unreadItemsHash;

  this.preload = function(data, callback) {
    unreadItemService.getUnreadItems(data.userId, data.troupeId)
      .then(function(ids) {
        var hash = {};
        ids.forEach(function(id) {
          hash[id] = true;
        });

        unreadItemsHash = hash;
      })
      .nodeify(callback);
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

  var userStategy = options.user ? null : new UserIdStrategy({ lean: options.lean });
  var unreadItemStategy, collapsedItemStategy;
  /* If options.unread has been set, we don't need a strategy */
  if(options.currentUserId && options.unread === undefined) {
    unreadItemStategy = new UnreadItemStategy();
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

  function safeArray(array) {
    if (!array) return [];
    return array;
  }

  function undefinedForEmptyArray(array) {
    if (!array) return undefined;
    if (!array.length) return undefined;
    return array;
  }

  this.map = function(item) {
    var unread = unreadItemStategy ? unreadItemStategy.map(item._id) : defaultUnreadStatus;
    var collapsed = collapsedItemStategy && collapsedItemStategy.map(item._id);

    var castArray = options.lean ? undefinedForEmptyArray : safeArray;

    return {
      id: item._id,
      text: item.text,
      status: item.status,
      html: item.html,
      sent: formatDate(item.sent),
      editedAt: item.editedAt ? formatDate(item.editedAt) : undefined,
      fromUser: options.user ? options.user : userStategy.map(item.fromUserId),
      unread: unread,
      collapsed: collapsed,
      room: troupeStrategy ? troupeStrategy.map(item.toTroupeId) : undefined,
      readBy: item.readBy ? item.readBy.length : undefined,
      urls: castArray(item.urls),
      initial: options.initialId && item._id == options.initialId || undefined,
      mentions: castArray(item.mentions && _.map(item.mentions, function(m) {
          return {
            screenName: m.screenName,
            userId: m.userId,
            userIds: m.userIds, // For groups
            group: m.group || undefined,
            announcement: m.announcement || undefined
          };
        })),
      issues: castArray(item.issues),
      meta: castArray(item.meta),
      highlights: item.highlights,
      v: getVersion(item)
    };

  };
}

ChatStrategy.prototype = {
  name: 'ChatStrategy'
};

module.exports = ChatStrategy;
