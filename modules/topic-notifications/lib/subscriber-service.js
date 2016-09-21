'use strict';

var Promise = require('bluebird');
var ForumNotification = require('gitter-web-persistence').ForumNotification;
var ForumObject = require('./forum-object');
var assert = require('assert');
var mongooseUtils = require('gitter-web-persistence-utils/lib/mongoose-utils');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var _ = require('lodash');

/**
 * List all the subscribers on a forum object
 */
function listForItem(forumObject) {
  assert(forumObject.type !== ForumObject.TYPE.Comment);

  var query = { forumId: forumObject.forumId, topicId: forumObject.topicId, replyId: forumObject.replyId };
  return ForumNotification.distinct('userId', query)
    .lean()
    .exec();
}

/**
 * Add a subscriber for an object. Returns true if the operation
 * modified the collection (ie, the user was not already a subscriber)
 */
function addSubscriber(forumObject, userId) {
  assert(forumObject.type !== ForumObject.TYPE.Comment);

  var query = {
    userId: userId,
    forumId: forumObject.forumId,
    topicId: forumObject.topicId,
    replyId: forumObject.replyId
  };

  return mongooseUtils.leanUpsert(ForumNotification, query, {
    $setOnInsert: query
  })
  .then(function(existing) {
    return !existing;
  });
}

/**
 * Remove a subscriber from an object. Returns true if the operation
 * modified the collection (ie, the user was not already a subscriber)
 */
function removeSubscriber(forumObject, userId) {
  assert(forumObject.type !== ForumObject.TYPE.Comment);

  var query = {
    userId: userId,
    forumId: forumObject.forumId,
    topicId: forumObject.topicId,
    replyId: forumObject.replyId
  };

  return ForumNotification.remove(query)
    .exec()
    .then(function(result) {
      return result && result.result && result.result.n > 0;
    });
}

function SubscriptionVisitor(results) {
  this.resultsHash = results && _.reduce(results, function(memo, item) {
    var forumId = item.forumId || 'null';
    var topicId = item.topicId || 'null';
    var replyId = item.replyId || 'null';
    memo[forumId + topicId + replyId] = true;
    return memo;
  }, {});
}

SubscriptionVisitor.prototype.isSubscribed = function(forumObject) {
  if (!this.resultsHash) return false;

  var forumId = forumObject.forumId || 'null';
  var topicId = forumObject.topicId || 'null';
  var replyId = forumObject.replyId || 'null';

  return !!(this.resultsHash[forumId + topicId + replyId]);
}

function createSubscriptionVisitorForUser(userId, type, forumObjects) {
  assert(type !== ForumObject.TYPE.Comment);
  if (!forumObjects.length) {
    return new SubscriptionVisitor();
  }

  var forumIdSet = {};
  var topicIdSet;
  var replyIds;

  if (type !== ForumObject.TYPE.Forum) {
    // Topics and Replies
    topicIdSet = {};

    if (type !== ForumObject.TYPE.Topic) {
      // Replies
      replyIds = [];

      if (type !== ForumObject.TYPE.Reply) {
        assert(false, 'createSubscriptionVisitorForUser requires a forum, topic or reply');
      }
    }
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
  var topicIds = topicIdSet && mongoUtils.asObjectIDs(Object.keys(topicIdSet));

  var query = {
    userId: userId,
    forumId: forumIds.length === 1 ? forumIds[0] : { $in: forumIds },
    topicId: topicIds ? { $in: topicIds } : { $eq: null },
    replyId: replyIds ? { $in: replyIds } : { $eq: null },
  };

  return ForumNotification.find(query, { _id: 0, forumId: 1, topicId: 1, replyId: 1 })
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
