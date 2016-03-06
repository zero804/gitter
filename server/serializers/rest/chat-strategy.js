"use strict";

var unreadItemService     = require("../../services/unread-item-service");
var collapsedChatsService = require('../../services/collapsed-chats-service');
var getVersion            = require('../get-model-version');
var UserIdStrategy        = require('./user-id-strategy');
var _                     = require('lodash');
var Promise               = require('bluebird');

function formatDate(d) {
  return d ? d.toISOString() : null;
}

function UnreadItemStategy(options) {
  var unreadItemsHash;

  this.preload = function() {
    return unreadItemService.getUnreadItems(options.userId, options.roomId)
      .then(function(ids) {
        var hash = {};

        _.each(ids, function(id) {
          hash[id] = true;
        });

        unreadItemsHash = hash;
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

  this.preload = function() {
    return collapsedChatsService.getHash(userId, roomId)
      .then(function(hash) {
        itemsHash = hash;
      });
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

  var useLookups = options.lean === 2;

  var userLookups;
  if (useLookups) {
    userLookups = {};
  }

  var userStategy = options.user ? null : new UserIdStrategy({ lean: options.lean });

  var unreadItemStategy, collapsedItemStategy;
  /* If options.unread has been set, we don't need a strategy */
  if(options.currentUserId && options.unread === undefined) {
    unreadItemStategy = new UnreadItemStategy({ userId: options.currentUserId, roomId: options.troupeId });
  }

  if (options.currentUserId && options.troupeId) {
    collapsedItemStategy = new CollapsedItemStrategy({ userId: options.currentUserId, roomId: options.troupeId });
  }

  var defaultUnreadStatus = options.unread === undefined ? true : !!options.unread;

  this.preload = function(items) {
    var strategies = [];

    // If the user is fixed in options, we don't need to look them up using a strategy...
    if(userStategy) {
      var users = items.map(function(i) { return i.fromUserId; });
      strategies.push(userStategy.preload(users));
    }

    if(unreadItemStategy) {
      strategies.push(unreadItemStategy.preload());
    }

    if(collapsedItemStategy) {
      strategies.push(collapsedItemStategy.preload());
    }

    return Promise.all(strategies);
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

  function mapUser(userId) {
    if (useLookups) {
      if (!userLookups[userId]) {
        userLookups[userId] = userStategy.map(userId);
      }

      return userId;
    } else {
      return userStategy.map(userId);
    }
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
      fromUser: options.user ? options.user : mapUser(item.fromUserId),
      unread: unread,
      collapsed: collapsed,
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

  this.postProcess = function(serialized) {
    if (useLookups) {
      return {
        items: serialized.toArray(),
        lookups: {
          users: userLookups
        }
      };
    } else {
      return serialized.toArray();
    }
  };
}

ChatStrategy.prototype = {
  name: 'ChatStrategy'
};

module.exports = ChatStrategy;
