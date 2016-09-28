'use strict';

var ForumReaction = require('gitter-web-persistence').ForumReaction;
var ForumObject = require('gitter-web-topic-models/lib/forum-object');
var assert = require('assert');
var mongooseUtils = require('gitter-web-persistence-utils/lib/mongoose-utils');

function updateReactionTotals(forumObject, reaction, inc) {
  var Model = forumObject.type.model;
  var query = forumObject.getQuery();
  var incOp = {};
  incOp['reactionCounts.' + reaction] = inc;

  return Model.update(query, {
      $inc: incOp
    })
    .exec();
}

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
    var modified = !!(result.nModified || result.upserted && result.upserted.length);
    if (!modified) return false;

    return updateReactionTotals(forumObject, reaction, +1)
      .return(true);
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
      var modified = result.result.n > 0;
      if (!modified) return false;

      return updateReactionTotals(forumObject, reaction, -1)
        .return(true);
    })
}


module.exports = {
  addReaction: addReaction,
  removeReaction: removeReaction,
}
