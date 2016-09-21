'use strict';

var ForumNotification = require('gitter-web-persistence').ForumNotification;
var ForumObject = require('./forum-object');
var assert = require('assert');
var mongooseUtils = require('gitter-web-persistence-utils/lib/mongoose-utils');

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
 * modified the collection (ie, when the user is not already a subscriber)
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
 * modified the collection (ie, the user is already a subscriber)
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

module.exports = {
  listForItem: listForItem,
  addSubscriber: addSubscriber,
  removeSubscriber: removeSubscriber
}
