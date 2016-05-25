"use strict";

var env                   = require('gitter-web-env');
var logger                = env.logger;
var _                     = require("lodash");
var Promise               = require('bluebird');
var uniqueIds             = require('mongodb-unique-ids');
var appEvents             = require('gitter-web-appevents');
var createDistribution    = require('./create-distribution');
var engine                = require('./engine');
var readByService         = require("../readby-service");
var roomMembershipService = require('../room-membership-service');
var mongoUtils            = require('gitter-web-persistence-utils/lib/mongo-utils');
var RedisBatcher          = require('../../utils/redis-batcher').RedisBatcher;
var recentRoomCore        = require('../core/recent-room-core');
var debug                 = require('debug')('gitter:app:unread-items:service');
var badgeBatcher          = new RedisBatcher('badge', 1000, batchBadgeUpdates);
var distributionDelta     = require('./distribution-delta');

/* Handles batching badge updates to users */
function batchBadgeUpdates(key, userIds, done) {
  // Remove duplicates
  userIds = uniqueIds(userIds);

  // Get responders to respond
  appEvents.batchUserBadgeCountUpdate({
    userIds: userIds
  });

  done();
}

function sinceFilter(since) {
  var sinceObjectID = mongoUtils.createIdForTimestampString(since).toString();
  return function(id) {
    return id >= sinceObjectID;
  };
}

/**
 * Item removed
 */
var removeItem = Promise.method(function (troupeId, itemId) {
  if(!troupeId) throw new Error("removeItem failed. Troupe cannot be null");
  if(!itemId) throw new Error("removeItem failed. itemId cannot be null");

  return roomMembershipService.findMembersForRoomWithLurk(troupeId)
    .then(function(userIdsWithLurk) {
      var userIds = Object.keys(userIdsWithLurk);

      // Publish out an unread item removed event
      var data = { chat: [itemId] };

      userIds.forEach(function(userId) {
        appEvents.unreadItemsRemoved(userId, troupeId, data);
      });

      var userIdsForNotify = userIds.filter(function(u) {
        return !userIdsWithLurk[u];
      });

      return engine.removeItem(troupeId, itemId, userIdsForNotify)
        .then(function(removeResults) {
          removeResults.forEach(function(removeResult) {

            if(removeResult.unreadCount >= 0 || removeResult.mentionCount >= 0) {
              appEvents.troupeUnreadCountsChange({
                userId: removeResult.userId,
                troupeId: troupeId,
                total: removeResult.unreadCount,
                mentions: removeResult.mentionCount
              });
            }

            if (removeResult.badgeUpdate) {
              queueBadgeUpdateForUser(removeResult.userId);
            }

          });

        });

  });
});

/*
  This ensures that if all else fails, we clear out the unread items
  It should only have any effect when data is inconsistent
*/
var ensureAllItemsRead = Promise.method(function(userId, troupeId) {
  if(!userId) throw new Error("ensureAllItemsRead failed. userId required");
  if(!troupeId) throw new Error("ensureAllItemsRead failed. troupeId required");

  return engine.ensureAllItemsRead(userId, troupeId)
    .then(function(result) {

      // Notify the user
      appEvents.troupeUnreadCountsChange({
        userId: userId,
        troupeId: troupeId,
        total: 0,
        mentions: 0
      });

      if (result.badgeUpdate) {
        queueBadgeUpdateForUser(userId);
      }

    });
});

exports.ensureAllItemsRead = ensureAllItemsRead;

/**
 * Returns a hash of hash {user:troupe:ids} of users who have
 * outstanding notifications since before the specified time
 * @return a promise of hash
 */
exports.listTroupeUsersForEmailNotifications = function(horizonTime, emailLatchExpiryTimeS) {
  return engine.listTroupeUsersForEmailNotifications(horizonTime, emailLatchExpiryTimeS);
};

/**
 * Mark many items as read, for a single user and troupe
 */
exports.markItemsRead = Promise.method(function markItemsRead(userId, troupeId, itemIds, options) {
  if(!userId) throw new Error("userId required");
  if(!troupeId) throw new Error("troupeId required");

  var markAllRead = options && options.markAllRead;

  if(!markAllRead) {
    // No need to send individual notifications on markAllRead
    appEvents.unreadItemsRemoved(userId, troupeId, { chat: itemIds });
  }

  return engine.markItemsRead(userId, troupeId, itemIds)
    .then(function(result) {
      if(result.unreadCount >= 0 || result.mentionCount >= 0) {
        // Notify the user
        appEvents.troupeUnreadCountsChange({
          userId: userId,
          troupeId: troupeId,
          total: result.unreadCount,
          mentions: result.mentionCount
        });
      }

      /* Do we need to send the user a badge update? */
      if (result.badgeUpdate) {
        queueBadgeUpdateForUser(userId);
      }

      var recordAsRead = !options || options.recordAsRead === undefined ? true : options.recordAsRead;

      if(recordAsRead) {
        return readByService.recordItemsAsRead(userId, troupeId, { chat: itemIds });
      }

    });

});

exports.markAllChatsRead = Promise.method(function(userId, troupeId, options) {
  if(!mongoUtils.isLikeObjectId(userId)) throw new Error('userId must be a mongoid');
  if(!mongoUtils.isLikeObjectId(troupeId)) throw new Error('troupeId must be a mongoid');

  if(!options) options = {};
  appEvents.markAllRead({ userId: userId, troupeId: troupeId });

  return exports.getUnreadItems(userId, troupeId)
    .then(function(chatIds) {
      /* If we already have everything marked as read, force all read */
      if(!chatIds.length) return ensureAllItemsRead(userId, troupeId, options);

      if(!('recordAsRead' in options)) options.recordAsRead = false;

      options.markAllRead = true; // Don't send individual item read events

      /* Don't mark the items as read */
      return exports.markItemsRead(userId, troupeId, chatIds, options);
    });
});

exports.getUserUnreadCountsForTroupeIds = function(userId, troupeIds) {
  return engine.getUserUnreadCountsForRooms(userId, troupeIds);
};

exports.getUnreadItems = function(userId, troupeId) {
  return engine.getUnreadItems(userId, troupeId);
};

exports.getAllUnreadItemCounts = function(userId) {
  return engine.getAllUnreadItemCounts(userId);
};

exports.getRoomIdsMentioningUser = function(userId) {
  return engine.getRoomsMentioningUser(userId);
};

exports.getFirstUnreadItem = function(userId, troupeId) {
  return engine.getUnreadItems(userId, troupeId)
    .then(function(members) {
      return getOldestId(members);
    })
    .catch(function(err) {
      logger.warn("unreadItemService.getUnreadItems failed: " + err, { exception: err });
      return null;
    });
};

exports.getUnreadItemsForUser = function(userId, troupeId) {
  return engine.getUnreadItemsAndMentions(userId, troupeId)
    .spread(function(chats, mentions) {
      return {
        chat: chats,
        mention: mentions
      };
    });
};

/* Get unread items and mentions for a user since a particular date */
exports.getUnreadItemsForUserTroupeSince = function(userId, troupeId, since) {
  return engine.getUnreadItemsAndMentions(userId, troupeId)
    .spread(function(chats, mentions) {

      return [
        chats.filter(sinceFilter(since)),
        mentions.filter(sinceFilter(since))
      ];
    });
};


/**
 * Get the badge counts for userIds
 * @return promise of a hash { userId1: 1, userId: 2, etc }
 */
exports.getBadgeCountsForUserIds = function(userIds, callback) {
  return engine.getBadgeCountsForUserIds(userIds)
    .nodeify(callback);
};

function getOldestId(ids) {
  if(!ids.length) return null;

  return _.min(ids, function(id) {
    // Create a new ObjectID with a specific timestamp
    return mongoUtils.getTimestampFromObjectId(id);
  });
}

function getTroupeIdsCausingBadgeCount(userId) {
  return engine.getRoomsCausingBadgeCount(userId);
}

function withSequence(sequence, callback) {
  if (sequence.isEmpty()) return;
  var array = sequence.toArray();
  return callback(array);
}

function processResultsForNewItemWithMentions(troupeId, chatId, distribution, resultsDistribution, isEdit) {
  debug("distributing chat notification to users");

  distribution.getNotifyNewRoom()
    .forEach(function(userId) {
      appEvents.userMentionedInNonMemberRoom({ troupeId: troupeId, userId: userId });
    });

  var newUnreadItemNoMention = { chat: [chatId] };
  resultsDistribution.getNewUnreadWithoutMention()
    .forEach(function(userId) {
      appEvents.newUnreadItem(userId, troupeId, newUnreadItemNoMention, true);
    });

  var newUnreadItemWithMention = { chat: [chatId], mention: [chatId] };
  resultsDistribution.getNewUnreadWithMention()
    .forEach(function(userId) {
      appEvents.newUnreadItem(userId, troupeId, newUnreadItemWithMention, true);
    });

  resultsDistribution.getTroupeUnreadCountsChange()
    .forEach(function(update) {
      appEvents.troupeUnreadCountsChange({
        userId: update.userId,
        troupeId: troupeId,
        total: update.total,
        mentions: update.mentions
      });
    });

  if (!isEdit) {
    // Next notify all the users currently online but not in this room who
    // will receive desktop notifications
    withSequence(distribution.getWebNotifications(), function(userIds) {
      appEvents.newOnlineNotification(troupeId, chatId, userIds);
    });

    withSequence(distribution.getPushCandidatesWithoutMention(), function(userIds) {
      appEvents.newPushNotificationForChat(troupeId, chatId, userIds, false);
    });

    withSequence(distribution.getPushCandidatesWithMention(), function(userIds) {
      appEvents.newPushNotificationForChat(troupeId, chatId, userIds, true);
    });

    // Next, notify all the lurkers
    // Note that this can be a very long list in a big room
    distribution.getConnectedActivityUserIds()
      .forEach(function(userId) {
        appEvents.newLurkActivity({ userId: userId, troupeId: troupeId });
      });

  }

  withSequence(resultsDistribution.getBadgeUpdates(), function(userIds) {
    queueBadgeUpdateForUser(userIds);
  });

  debug("distribution of chat notification to users completed");
  return null;
}

function createChatUnreadItems(fromUserId, troupe, chat) {
  return createDistribution(fromUserId, troupe, chat.mentions)
    .then(function(distribution) {
      var userIdsWithMentions = distribution.getEngineNotifies();

      return engine.newItemWithMentions(troupe.id, chat.id, userIdsWithMentions)
        .then(function(results) {
          var resultsDistribution = distribution.resultsProcessor(results);
          return processResultsForNewItemWithMentions(troupe.id, chat.id, distribution, resultsDistribution, false);
        });
    });
}
exports.createChatUnreadItems = createChatUnreadItems;

function removeMentionsForUpdatedChat(troupeId, chatId, removeUserIds) {
  return engine.removeItem(troupeId, chatId, removeUserIds)
    .then(function(results) {
      results.forEach(function(result) {
        // Remove the mention for the user
        // TODO: only for only users
        appEvents.unreadItemsRemoved(result.userId, troupeId, { mention: [chatId] });

        if(result.unreadCount >= 0 || result.mentionCount >= 0) {
          // Notify the user
          appEvents.troupeUnreadCountsChange({
            userId: result.userId,
            troupeId: troupeId,
            total: result.unreadCount,
            mentions: result.mentionCount
          });
        }

        if (result.badgeUpdate) {
          queueBadgeUpdateForUser(result.userId);
        }

      });
    });
}

/**
 * Updates the mentions for an edited message
 */
function updateChatUnreadItems(fromUserId, troupe, chat, originalMentions) {
  var troupeId = troupe.id;
  var chatId = chat.id;

  return distributionDelta(fromUserId, troupe, chat.mentions, originalMentions)
    .bind({ })
    .spread(function(delta, newDistribution) {
      this.delta = delta;
      this.newDistribution = newDistribution;

      return removeMentionsForUpdatedChat(troupeId, chatId, delta.remove);
    })
    .then(function() {
      var delta = this.delta;
      var distribution = this.newDistribution;

      if (delta.add.isEmpty()) return null;

      // Add additional mentions
      return engine.newItemWithMentions(troupeId, chatId, delta.add)
        .then(function(results) {
          var resultsDistribution = distribution.resultsProcessorForUpdate(results);
          return processResultsForNewItemWithMentions(troupeId, chatId, distribution, resultsDistribution, true);
        });
    });
}
exports.updateChatUnreadItems = updateChatUnreadItems;

var sendBadgeUpdates = true;
function queueBadgeUpdateForUser(userIds) {
  if (!sendBadgeUpdates) return;
  var len = Array.isArray(userIds) ? userIds.length : 1;
  debug("Batching badge update for %s users", len);
  badgeBatcher.add('queue', userIds);
}

exports.getActivityIndicatorForTroupeIds = function(troupeIds, userId) {
  return Promise.join(
    recentRoomCore.getTroupeLastAccessTimesForUser(userId),
    engine.getLastChatTimestamps(troupeIds),
    function(allLastAccessTimes, rawLastMsgTimes) {
      var lastAccessTimes = troupeIds.reduce(function(accum, troupeId) {
        accum[troupeId] = allLastAccessTimes[troupeId];
        return accum;
      }, {});

      var lastMsgTimes = troupeIds.reduce(function(accum, troupeId, index) {
        if (!rawLastMsgTimes[index]) return accum;
        var ts = parseInt(rawLastMsgTimes[index], 10);
        accum[troupeId] = new Date(ts);
        return accum;
      }, {});


      var activity = Object.keys(lastAccessTimes).reduce(function(accum, troupeId) {
        if (!lastMsgTimes[troupeId]) return accum;
        accum[troupeId] = lastMsgTimes[troupeId] > lastAccessTimes[troupeId];
        return accum;
      }, {});

      return activity;
  });
};


exports.listen = function() {
  badgeBatcher.listen();
};

exports.testOnly = {
  setSendBadgeUpdates: function(value) {
    sendBadgeUpdates = value;
  },
  getOldestId: getOldestId,
  sinceFilter: sinceFilter,
  removeItem: removeItem,
  getTroupeIdsCausingBadgeCount: getTroupeIdsCausingBadgeCount,
  processResultsForNewItemWithMentions: processResultsForNewItemWithMentions
};
