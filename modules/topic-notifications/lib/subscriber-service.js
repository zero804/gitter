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

module.exports = {
  listForItem: listForItem,
  addSubscriber: addSubscriber
}
