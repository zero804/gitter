'use strict';

var ForumReaction = require('gitter-web-persistence').ForumReaction;
var ForumObject = require('gitter-web-topic-models/lib/forum-object');
var assert = require('assert');
var mongooseUtils = require('gitter-web-persistence-utils/lib/mongoose-utils');
var validReactions = require('./valid-reactions');
var StatusError = require('statuserror');

function listReactions(forumObject) {
  var Model = forumObject.type.model;
  var query = forumObject.getQuery();

  return Model.findOne(query)
    .select({ _id: 0, reactionCounts: 1 })
    .exec()
    .then(function(doc) {
      var reactionCounts = doc && doc.reactionCounts;

      if (reactionCounts) {
        return reactionCounts;
      }

      return null;
    });
}

function updateReactionTotals(forumObject, reaction, inc) {
  var Model = forumObject.type.model;
  var query = forumObject.getQuery();
  var incOp = {};
  incOp['reactionCounts.' + reaction] = inc;

  return Model.findOneAndUpdate(query, {
      $inc: incOp
    }, {
      new: true
    })
    .select({ _id: 0, reactionCounts: 1 })
    .exec()
    .then(function(doc) {
      var reactionCounts = doc && doc.reactionCounts;

      if (reactionCounts) {
        forumObject.liveCollectionPatch({
          reactions: reactionCounts
        });
      }

      return reactionCounts;
    });
}

function addReaction(forumObject, userId, reaction) {
  if (!validReactions.isValid(reaction)) {
    throw new StatusError(400);
  }

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
    if (!modified) return null;

    return updateReactionTotals(forumObject, reaction, +1);
  });
}

function removeReaction(forumObject, userId, reaction) {
  // Allow invalid reactions to be removed
  // in case they were valid in another version of the app
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
      if (!modified) return null;

      return updateReactionTotals(forumObject, reaction, -1);
    })
}


module.exports = {
  listReactions: listReactions,
  addReaction: addReaction,
  removeReaction: removeReaction,
}
