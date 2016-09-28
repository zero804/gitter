'use strict';

var ForumReaction = require('gitter-web-persistence').ForumReaction;
var ForumObject = require('gitter-web-topic-models/lib/forum-object');
var assert = require('assert');
var mongooseUtils = require('gitter-web-persistence-utils/lib/mongoose-utils');

function addReaction(forumObject, userId, reaction) {
  assert(forumObject.type !== ForumObject.TYPE.Forum);
  assert(reaction);

  var query = {
    userId: userId,
    forumId: forumObject.forumId,
    topicId: forumObject.topicId,
    replyId: forumObject.replyId,
    commentId: forumObject.commentId,
    reaction: reaction
  };

  return mongooseUtils.safeUpsertUpdate(ForumReaction, query, {
    $setOnInsert: {
      userId: userId,
      forumId: forumObject.forumId,
      topicId: forumObject.topicId,
      replyId: forumObject.replyId,
      commentId: forumObject.commentId,
      reaction: reaction
    }
  })
  .then(function(result) {
    return !!(result.nModified || result.upserted && result.upserted.length);
  });
}

function removeReaction(forumObject, userId, reaction) {
  assert(forumObject.type !== ForumObject.TYPE.Forum);
  assert(reaction);

  var query = {
    userId: userId,
    forumId: forumObject.forumId,
    topicId: forumObject.topicId,
    replyId: forumObject.replyId,
    commentId: forumObject.commentId,
    reaction: reaction
  };

  return ForumReaction.remove(query)
    .exec()
    .then(function(result) {
      return result.result.n > 0;
    });
}


module.exports = {
  addReaction: addReaction,
  removeReaction: removeReaction,
}
