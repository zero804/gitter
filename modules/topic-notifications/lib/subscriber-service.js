'use strict';

var Promise = require('bluebird');
var ForumSubscription = require('gitter-web-persistence').ForumSubscription;
var ForumObject = require('./forum-object');
var assert = require('assert');
var mongooseUtils = require('gitter-web-persistence-utils/lib/mongoose-utils');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var _ = require('lodash');

/**
 * Push an item to an array if it's not a particular value
 */
function pushItemIfNot(array, item, excludedItem) {
  if (excludedItem) {
    if (!mongoUtils.objectIDsEqual(item, excludedItem)) {
      array.push(item);
    }
  } else {
    array.push(item);
  }
}

/**
 * List all the subscribers on a forum object
 */
function listForItem(forumObject, options) {
  assert(forumObject.type !== ForumObject.TYPE.Comment);

  var query;

  if (forumObject.hasParent()) {
    var parentRef = forumObject.getParent();
    query = {
      $or: [{
        forumId: parentRef.forumId,
        topicId: parentRef.topicId,
        replyId: parentRef.replyId
      }, {
        forumId: forumObject.forumId,
        topicId: forumObject.topicId,
        replyId: forumObject.replyId
      }]
    };
  } else {
    // Forum queries
    query = {
      forumId: forumObject.forumId,
      topicId: forumObject.topicId,
      replyId: forumObject.replyId
    }
  }

  return ForumSubscription.find(query, { userId: 1, enabled: 1 })
    .lean()
    .sort({ userId: 1, forumId: 1, topicId: 1, replyId: 1 })
    .exec()
    .bind({
      exclude: options && options.exclude
    })
    .then(function(results) {
      // Iterate through the results to figure out which users
      // are subscribed to the item.
      // Note that the sort order of the results is crucial to the
      // functioning of this algorithm, so don't mess with it
      //
      // How it works
      // Notice the sort used above. We will get results like
      // user1: enabled
      // user1: disabled
      // user2: enabled
      // user3: disabled
      // user3: enabled
      //
      // The expected outcome from this state would be
      // user2, user
      //
      // Since each entry is sorted by user, followed by precendence,
      // so, for any user, the last entry is the most important one
      var currentUserId = null;
      var currentState = false;
      var userIds = [];

      for (var i = 0; i < results.length; i++) {
        var result = results[i];
        if (i > 0) {
          if (!mongoUtils.objectIDsEqual(result.userId, currentUserId)) {
            if (currentState) {
              pushItemIfNot(userIds, currentUserId, this.exclude);
            }
          }
        }
        currentState = result.enabled;
        currentUserId = result.userId;
      }

      // Append the last entry, if the final state is enabled.
      if (currentUserId && currentState) {
        pushItemIfNot(userIds, currentUserId, this.exclude);
      }

      return userIds;
    })
}

function setSubscriptionStatus(forumObject, userId, enabled) {
  assert(forumObject.type !== ForumObject.TYPE.Comment);

  var query = {
    userId: userId,
    forumId: forumObject.forumId,
    topicId: forumObject.topicId,
    replyId: forumObject.replyId
  };

  return mongooseUtils.safeUpsertUpdate(ForumSubscription, query, {
    $set: {
      userId: userId,
      forumId: forumObject.forumId,
      topicId: forumObject.topicId,
      replyId: forumObject.replyId,
      enabled: enabled
    }
  })
  .then(function(result) {
    return !!(result.nModified || result.upserted && result.upserted.length);
  });
}

/**
 * Add a subscriber for an object. Returns true if the operation
 * modified the collection (ie, when the user is not already a subscriber)
 */
function addSubscriber(forumObject, userId) {
  return setSubscriptionStatus(forumObject, userId, true);
}

/**
 * Remove a subscriber from an object. Returns true if the operation
 * modified the collection (ie, the user is already a subscriber)
 */
function removeSubscriber(forumObject, userId) {
  return setSubscriptionStatus(forumObject, userId, false);
}

function SubscriptionVisitor(results) {
  if (!results) return;

  this.resultsHash = results && _.reduce(results, function(memo, item) {
    var forumId = item.forumId || 'null';
    var topicId = item.topicId || 'null';
    var replyId = item.replyId || 'null';
    memo[forumId + topicId + replyId] = item.enabled;
    return memo;
  }, {});
}

SubscriptionVisitor.prototype.isSubscribed = function(forumObject) {
  if (!this.resultsHash) return false;

  var key = (forumObject.forumId || 'null') +
    (forumObject.topicId || 'null') +
    (forumObject.replyId || 'null');

  if (this.resultsHash.hasOwnProperty(key)) {
    return this.resultsHash[key];
  }

  if (!forumObject.hasParent()) return false;
  var parentRef = forumObject.getParent();

  key = (parentRef.forumId || 'null') +
    (parentRef.topicId || 'null') +
    (parentRef.replyId || 'null');

  if (this.resultsHash.hasOwnProperty(key)) {
    return this.resultsHash[key];
  }

  return false;
}

function createSubscriptionVisitorForUser(userId, type, forumObjects) {
  if (!forumObjects.length) {
    return new SubscriptionVisitor();
  }

  var forumIdSet = {};
  var topicIdSet;
  var replyIds;

  switch(type) {
    case ForumObject.TYPE.Forum:
      break;

    case ForumObject.TYPE.Topic:
      topicIdSet = {};
      break;

    case ForumObject.TYPE.Reply:
      topicIdSet = {};
      replyIds = [null];
      break;

    default:
      assert(false, 'createSubscriptionVisitorForUser requires a forum, topic or reply');
  }

  _.forEach(forumObjects, function(forumObject) {
    assert.strictEqual(forumObject.type, type, 'Types do not match');

    forumIdSet[forumObject.forumId] = true;

    if (topicIdSet) {
      topicIdSet[forumObject.topicId] = true;
    }

    if (replyIds) {
      replyIds.push(forumObject.replyId);
    }
  });

  var forumIds = mongoUtils.asObjectIDs(Object.keys(forumIdSet));
  var topicIds;

  switch(type) {
    case ForumObject.TYPE.Topic:
      topicIds = [null].concat(mongoUtils.asObjectIDs(Object.keys(topicIdSet)));
      break;

    case ForumObject.TYPE.Reply:
      topicIds = mongoUtils.asObjectIDs(Object.keys(topicIdSet));
      break;
  }

  var query = {
    userId: userId,
    forumId: forumIds.length === 1 ? forumIds[0] : { $in: forumIds },
    topicId: topicIds ? { $in: topicIds } : { $eq: null },
    replyId: replyIds ? { $in: replyIds } : { $eq: null },
  };

  return ForumSubscription.find(query, { _id: 0, forumId: 1, topicId: 1, replyId: 1, enabled: 1 })
    .lean()
    .exec()
    .then(function(results) {
      return new SubscriptionVisitor(results);
    });
}

module.exports = {
  listForItem: listForItem,
  addSubscriber: addSubscriber,
  removeSubscriber: removeSubscriber,
  createSubscriptionVisitorForUser: Promise.method(createSubscriptionVisitorForUser)
}
