/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var troupeService    = require("./troupe-service");
var readByService    = require("./readby-service");
var userService      = require("./user-service");
var roomPermissionsModel = require('./room-permissions-model');
var appEvents        = require("../app-events");
var _                = require("underscore");
var winston          = require('../utils/winston');
var mongoUtils       = require('../utils/mongo-utils');
var RedisBatcher     = require('../utils/redis-batcher').RedisBatcher;
var Q                = require('q');
var badgeBatcher     = new RedisBatcher('badge', 300);
var engine           = require('./unread-item-service-engine');

function sinceFilter(since) {
  return function(id) {
    var date = mongoUtils.getDateFromObjectId(id);
    return date.getTime() >= since;
  };

}

badgeBatcher.listen(function(key, userIds, done) {
  // Remove duplicates
  userIds = _.uniq(userIds);

  // Get responders to respond
  appEvents.batchUserBadgeCountUpdate({
    userIds: userIds
  });

  done();
});

function republishBadgeForUser(userId) {
  badgeBatcher.add('queue', userId);
}

function reject(msg) {
  winston.error(msg);
  return Q.reject(new Error(msg));
}

/**
 * New item added
 * @return {promise} promise of result from troupeService.findUserIdsForTroupeWithLurk(troupeId)
 *
 * Why return such an odd value? It's used by the next caller.
 */
function newItem(troupeId, creatorUserId, itemType, itemId) {
  if(!troupeId) { return reject("newitem failed. Troupe cannot be null"); }
  if(!itemType) { return reject("newitem failed. itemType cannot be null");  }
  if(!itemId) { return reject("newitem failed. itemId cannot be null"); }

  return troupeService.findUserIdsForTroupeWithLurk(troupeId)
    .then(function(troupe) {
      var userIdsWithLurk = troupe.users;
      var userIds = Object.keys(userIdsWithLurk);

      if(creatorUserId) {
        userIds = userIds.filter(function(userId) {
          return ("" + userId) != ("" + creatorUserId);
        });
      }

      // Publish out an new item event
      var data = {};
      data[itemType] = [itemId];

      var userIdsForNotify = userIds.filter(function(u) {
        return !userIdsWithLurk[u];
      });

      return engine.newItemForUsers(troupeId, itemId, userIdsForNotify)
        .then(function(newItemResults) {

          newItemResults.forEach(function(newItemResult) {

            if(newItemResult.unreadCount >= 0) {
              // Notify the user
              appEvents.troupeUnreadCountsChange({
                userId: newItemResult.userId,
                troupeId: troupeId,
                total: newItemResult.unreadCount
              });
            }

            if(newItemResult.badgeUpdate) {
              republishBadgeForUser(newItemResult.userId);
            }
          });


          // Send out troupe activity blink for lurking users
          userIds.forEach(function(u) {
            if(userIdsWithLurk[u]) {
              // Lurking, send them an activity "ping"
              appEvents.newLurkActivity({ userId: u, troupeId: troupeId });
            } else {
              // Not lurking, send them the full update
              appEvents.newUnreadItem(u, troupeId, data);
            }
          });
        });

    });
}

/**
 * Item removed
 * @return {promise} promise of nothing
 */
function removeItem(troupeId, itemType, itemId) {
  if(!troupeId) return reject("newitem failed. Troupe cannot be null");
  if(!itemType) return reject("newitem failed. itemType cannot be null");
  if(!itemId) return reject("newitem failed. itemId cannot be null");

  return troupeService.findUserIdsForTroupeWithLurk(troupeId)
    .then(function(troupe) {
      var userIdsWithLurk = troupe.users;
      var userIds = Object.keys(userIdsWithLurk);

      // Publish out an unread item removed event
      // TODO: we could actually check whether this user thinks this item is UNREAD
      var data = {};
      data[itemType] = [itemId];
      userIds.forEach(function(userId) {
        appEvents.unreadItemsRemoved(userId, troupeId, data);
      });

      var userIdsForNotify = userIds.filter(function(u) {
        return !userIdsWithLurk[u];
      });

      return engine.removeItem(troupeId, itemId, userIdsForNotify)
        .then(function(removeResults) {
          removeResults.forEach(function(removeResult) {

            /* a negative number means nothing happened */
            if(removeResult.unreadCount >= 0) {
              appEvents.troupeUnreadCountsChange({
                userId: removeResult.userId,
                troupeId: troupeId,
                total: removeResult.unreadCount
              });
            }

            if(removeResult.removedLastMention) {
              // Notify the user
              appEvents.troupeMentionCountsChange({
                userId: removeResult.userId,
                troupeId: troupeId,
                total: 0,
                op: 'remove',
                member: true // XXX: may not always be the case
              });
            }

            if(removeResult.badgeUpdate) {
              republishBadgeForUser(removeResult.userId);
            }

          });

        });

  });
}

/*
  This ensures that if all else fails, we clear out the unread items
  It should only have any effect when data is inconsistent
*/
function ensureAllItemsRead(userId, troupeId, member) {
  if(!userId) return reject("newitem failed. userId required");
  if(!troupeId) return reject("newitem failed. troupeId required");

  return engine.ensureAllItemsRead(userId, troupeId)
    .then(function(result) {

      // Notify the user
      appEvents.troupeUnreadCountsChange({
        userId: userId,
        troupeId: troupeId,
        total: 0
      });

      appEvents.troupeMentionCountsChange({
        userId: userId,
        troupeId: troupeId,
        total: 0,
        op: 'remove',
        member: member
      });

      if(result.badgeUpdate) {
        republishBadgeForUser(userId);
      }

    });
}

/**
 * Mark an item in a troupe as having been read by a user
 * @return {promise} promise of nothing
 */
function markItemsOfTypeRead(userId, troupeId, ids, member) {
  if(!userId) return reject("userId required");
  if(!troupeId) return reject("troupeId required");

  if(!ids.length) return Q.resolve();

  return engine.markItemsRead(userId, troupeId, ids)
    .then(function(result) {
      if(result.unreadCount >= 0) {
        // Notify the user
        appEvents.troupeUnreadCountsChange({
          userId: userId,
          troupeId: troupeId,
          total: result.unreadCount
        });

        if(result.unreadCount === 0) {
          // Notify the user
          appEvents.troupeMentionCountsChange({
            userId: userId,
            troupeId: troupeId,
            total: 0,
            op: 'remove',
            member: member
          });
        }
      }

      if(result.badgeUpdate) {
        republishBadgeForUser(userId);
      }
    });
}

// /**
//  * Mark an item in a troupe as having been read by a user
//  * @return {promise} promise of nothing
//  */
// function setLastReadTimeForUser(userId, troupeId, lastReadTimestamp) {
//   assert(userId, 'Expected userId');
//   assert(lastReadTimestamp, 'Expected lastReadTimestamp');

//   return Q.ninvoke(redisClient, "mset",
//     "lrt:" + userId, lastReadTimestamp,
//     "lrtt:" + userId + ":" + troupeId, lastReadTimestamp);
// }

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
exports.markItemsRead = function(userId, troupeId, itemIds, mentionIds, options) {
  // Configure options
  if(!options) options = {};

  // { member : default true }
  if(options.member === undefined) options.member = true;

  // { recordAsRead: default true }
  if(options.recordAsRead === undefined) options.recordAsRead = true;

  var allIds = [];

  if(itemIds) allIds = allIds.concat(itemIds);
  if(mentionIds) allIds = allIds.concat(mentionIds);

  appEvents.unreadItemsRemoved(userId, troupeId, { chat: itemIds }); // TODO: update

  return Q.all([
    markItemsOfTypeRead(userId, troupeId, allIds, options.member),
    // setLastReadTimeForUser(userId, troupeId, now),
    mentionIds && mentionIds.length && removeMentionForUser(userId, troupeId, mentionIds, options.member)
    ])
    .then(function() {
      if(!options.recordAsRead) {
        return;
      }

      // For the moment, we're only bothering with chats for this
      return readByService.recordItemsAsRead(userId, troupeId, { chat: allIds }); // TODO: drop the hash
    });

};

exports.markAllChatsRead = function(userId, troupeId, options) {
  if(!mongoUtils.isLikeObjectId(userId)) return reject('userId must be a mongoid');
  if(!mongoUtils.isLikeObjectId(troupeId)) return reject('troupeId must be a mongoid');

  if(!options) options = {};
  appEvents.markAllRead({ userId: userId, troupeId: troupeId });

  return exports.getUnreadItems(userId, troupeId, 'chat')
    .then(function(chatIds) {
      /* If we already have everything marked as read, force all read */
      if(!chatIds.length) return ensureAllItemsRead(userId, troupeId, options);

      if(!('recordAsRead' in options)) options.recordAsRead = false;

      /* Don't mark the items as read */
      return exports.markItemsRead(userId, troupeId, chatIds, null, options);
    });
};

exports.getUserUnreadCounts = function(userId, troupeId) {
  return engine.getUserUnreadCounts(userId, troupeId);
};

exports.getUserUnreadCountsForTroupeIds = function(userId, troupeIds) {
  return engine.getUserUnreadCountsForRooms(userId, troupeIds);
};

exports.getUserMentionCountsForTroupeIds = function(userId, troupeIds) {
  return engine.getUserMentionCountsForRooms(userId, troupeIds);
};

// /** Returns hash[userId] = unixTime for each of the queried users */
// exports.findLastReadTimesForUsers = function(userIds, callback) {
//   var keysToQuery = userIds.map(function(userId) { return "lrt:" + userId;});
//   redisClient.mget(keysToQuery, function(err, times) {
//     if(err) return callback(err);
//     var result = {};
//     times.forEach(function(time, index) {
//       if(time) {
//         var userId = userIds[index];
//         result[userId] = time;
//       }
//     });

//     callback(null, result);
//   });
// };

// /** Returns hash[userId] = unixTime for each of the queried users */
// exports.findLastReadTimesForUsersForTroupe = function(userIds, troupeId, callback) {
//   var keysToQuery = userIds.map(function(userId) { return "lrtt:" + userId + ":" + troupeId;});
//   redisClient.mget(keysToQuery, function(err, times) {
//     if(err) return callback(err);
//     var result = {};
//     times.forEach(function(time, index) {
//       if(time) {
//         var userId = userIds[index];
//         result[userId] = time;
//       }
//     });

//     callback(null, result);
//   });
// };


exports.getUnreadItems = function(userId, troupeId) {
  return engine.getUnreadItems(userId, troupeId);
};

exports.getAllUnreadItemCounts = function(userId) {
  return engine.getAllUnreadItemCounts(userId);
};

exports.getRoomIdsMentioningUser = function(userId) {
  return engine.getRoomsMentioningUser(userId);
};

exports.getUnreadItemsForUserTroupeSince = function(userId, troupeId, since, callback) {
  return engine.getUnreadItems(userId, troupeId)
    .then(function(chatItems) {
      chatItems = chatItems.filter(sinceFilter(since));

      var response = {};
      if(chatItems.length) {
        response.chat = chatItems;
      }

      return response;
    })
    .nodeify(callback);
};

exports.getFirstUnreadItem = function(userId, troupeId) {
  return engine.getUnreadItems(userId, troupeId)
    .then(function(members) {
      return getOldestId(members);
    })
    .catch(function(err) {
      winston.warn("unreadItemService.getUnreadItems failed: " + err, { exception: err });
      return null;
    });
};

exports.getUnreadItemsForUser = function(userId, troupeId, callback) {
  return exports.getUnreadItems(userId, troupeId)
    .then(function(results) {
      return {
        chat: results
      };
    })
    .nodeify(callback);
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


/**
 * New item added
 * @return {promise} promise of nothing
 */
function newMention(troupeId, itemId, userIds, usersHash) {
  if(!troupeId) return reject("newMention failed. Troupe cannot be null");
  if(!itemId) return reject("newMention failed. itemId cannot be null");
  if(!userIds.length) return Q.resolve();

  return engine.newMention(troupeId, itemId, userIds)
    .then(function(result) {
      userIds.forEach(function(userId) {
        var mentionCount = result[userId];

        if(mentionCount >= 0) {
          // Notify the user
          appEvents.troupeMentionCountsChange({
            userId: userId,
            troupeId: troupeId,
            total: mentionCount,
            op: 'add',
            member: userId in usersHash /* See bayeux-events-bridge for why we need this  */
          });
        }

        // TODO: email users about their mentions.. Look at newItem
      });

    });
}

/**
 * Remove the mentions and decrement counters. This will be called when a user reads an item
 */
function removeMentionForUser(userId, troupeId, itemIds, member) {
  if(!itemIds.length) return Q.resolve();

  return engine.removeMentionForUser(userId, troupeId, itemIds)
    .then(function(mentionCount) {
      if(mentionCount >= 0) {
        // Notify the user
        appEvents.troupeMentionCountsChange({
          userId: userId,
          troupeId: troupeId,
          total: mentionCount,
          op: 'remove',
          member: member
        });
      }
    });

}

function getTroupeIdsCausingBadgeCount(userId) {
  return engine.getRoomsCausingBadgeCount(userId);
}

/**
 * Returns a promise of nothing
 */
function detectAndCreateMentions(troupeId, troupe, creatingUserId, chat) {
  if(!chat.mentions || !chat.mentions.length) return Q.resolve();

  /* Figure out what type of room this is */
  var oneToOne = troupe.githubType === 'ONETOONE';

  var usersHash = troupe.users;
  if(!usersHash) return;

  var uniqueUserIds = {};
  chat.mentions.forEach(function(mention) {
    if(mention.group) {
      if(mention.userIds) {
        mention.userIds.forEach(function(userId) {
          uniqueUserIds[userId] = true;
        });
      }
    } else {
      uniqueUserIds[mention.userId] = true;
    }
  });

  var mentionMemberUserIds = [];
  var mentionLurkerAndNonMemberUserIds = [];

  var lookupUsers = [];

  Object.keys(uniqueUserIds).forEach(function(userId) {
    /* Don't be mentioning yourself yo */
    if(userId == creatingUserId) return;

    if(userId in usersHash) {
      var lurk = usersHash[userId];

      /* User is in the room? Always mention */
      if(lurk) {
        mentionLurkerAndNonMemberUserIds.push(userId);
      } else {
        mentionMemberUserIds.push(userId);
      }
      return;
    }

    if(!oneToOne) {
      /* We'll need to use the permissions-model to determine if they'll be allowed in */
      lookupUsers.push(userId);
    }

  });

  var lookup;
  if(lookupUsers.length) {
    lookup = userService.findByIds(lookupUsers);
  } else {
    lookup = Q.resolve([]);
  }

  return lookup.then(function(users) {
    if(!users.length) return;

    return Q.all(users.map(function(user) {
      return roomPermissionsModel(user, 'join', troupe)
        .then(function(access) {
          if(access) {
            mentionLurkerAndNonMemberUserIds.push(user.id);
          }

        });
    }));

  }).then(function() {
    /**
     * Lurkers and non members wont have an unread item, so the first thing
     * we'll need to do is create an unread item for them. Only then can we push the
     * mention
     */
    if(mentionLurkerAndNonMemberUserIds.length) {
      return engine.newItemForUsers(troupeId, chat.id, mentionLurkerAndNonMemberUserIds)
        .then(function() {
          var allUserIds = mentionLurkerAndNonMemberUserIds.concat(mentionMemberUserIds);
          return newMention(troupeId, chat.id, allUserIds, usersHash);
        })
        .then(function() {
          var data = {
            chat: [chat.id]
          };

          mentionLurkerAndNonMemberUserIds.forEach(function(userId) {
            // Lurkers never recieved a newUnreadItem. Send it to them
            appEvents.newUnreadItem(userId, troupeId, data);
          });

        });
    } else {
      return newMention(troupeId, chat.id, mentionMemberUserIds, usersHash);
    }
  });

}

function detectAndRemoveMentions(troupeId, creatingUserId, chat) {
  if(!chat.mentions) return;
  // XXX: remove the mention
}

exports.install = function() {

  appEvents.localOnly.onChat(function(data) {
    var operation = data.operation;
    var troupeId = data.troupeId;
    var model = data.model;

    if(!model) {
      winston.warn('No data model in onDataChangeEvent', { data: data});
      return;
    }

    var modelId = model.id;
    var creatingUserId = model.fromUser && model.fromUser.id;
    var promise;

    if(operation === 'create') {
      promise = newItem(troupeId, creatingUserId, 'chat', modelId)
        .then(function(troupe) {
          return detectAndCreateMentions(troupeId, troupe, creatingUserId, model);
        });

    } else if(operation === 'remove') {
      promise = removeItem(troupeId, 'chat', modelId)
        .then(function() {
          return detectAndRemoveMentions(troupeId, creatingUserId, model);
        });
    }

    if(promise) {
      promise.catch(function(err) {
        winston.error('unreadItemService failure: ' + err, { exception: err });
        throw err;
      });
    }

  });
};

exports.testOnly = {
  getOldestId: getOldestId,
  sinceFilter: sinceFilter,
  newItem: newItem,
  removeItem: removeItem,
  detectAndCreateMentions: detectAndCreateMentions,
  getTroupeIdsCausingBadgeCount: getTroupeIdsCausingBadgeCount

};
