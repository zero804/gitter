"use strict";


var env                   = require('gitter-web-env');
var logger                = env.logger;
var _                     = require('lodash');
var Promise               = require('bluebird');
var unreadItemService     = require("../../services/unread-items");
var collapsedChatsService = require('../../services/collapsed-chats-service');
var getVersion            = require('../get-model-version');
var UserIdStrategy        = require('./user-id-strategy');
var TroupeIdStrategy      = require('./troupe-id-strategy');

function formatDate(d) {
  return d ? d.toISOString() : null;
}

function UnreadItemStrategy(options) {
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

UnreadItemStrategy.prototype = {
  name: 'UnreadItemStrategy'
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
  if (!options) options = {};

  // useLookups will be set to true if there are any lookups that this strategy
  // understands. Currently it only knows about user lookups.
  var useLookups = false;
  var userLookups;
  if (options.lookups && options.lookups.indexOf('user') !== -1) {
    useLookups = true;
    userLookups = {};
  }

  if (useLookups) {
    if (options.lean) {
      // we're breaking users out, but then not returning their displayNames
      // which kinda defeats the purpose
      logger.warn("ChatStrategy was called with lookups, but also with lean", options);
    }
  }

  var userStrategy = options.user ? null : new UserIdStrategy({ lean: options.lean });

  var unreadItemStrategy, collapsedItemStrategy;
  /* If options.unread has been set, we don't need a strategy */
  if (options.currentUserId && options.unread === undefined) {
    unreadItemStrategy = new UnreadItemStrategy({ userId: options.currentUserId, roomId: options.troupeId });
  }

  if (options.currentUserId && options.troupeId) {
    collapsedItemStrategy = new CollapsedItemStrategy({ userId: options.currentUserId, roomId: options.troupeId });
  }

  var defaultUnreadStatus = options.unread === undefined ? true : !!options.unread;

  this.preload = function(items) {
    var strategies = [];

    // If the user is fixed in options, we don't need to look them up using a strategy...
    if (userStrategy) {
      var users = items.map(function(i) { return i.fromUserId; });
      strategies.push(userStrategy.preload(users));
    }

    if (unreadItemStrategy) {
      strategies.push(unreadItemStrategy.preload());
    }

    if (collapsedItemStrategy) {
      strategies.push(collapsedItemStrategy.preload());
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
    if (userLookups) {
      if (!userLookups[userId]) {
        userLookups[userId] = userStrategy.map(userId);
      }

      return userId;
    } else {
      return userStrategy.map(userId);
    }
  }

  this.map = function(item) {
    var unread = unreadItemStrategy ? unreadItemStrategy.map(item._id) : defaultUnreadStatus;
    var collapsed = collapsedItemStrategy && collapsedItemStrategy.map(item._id);

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
