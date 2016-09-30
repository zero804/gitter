'use strict';

var Promise = require('bluebird');
var ForumReaction = require('gitter-web-persistence').ForumReaction;
var ForumObject = require('gitter-web-topic-models/lib/forum-object');
var assert = require('assert');
var _ = require('lodash');
var ObjectIDSet = require('gitter-web-persistence-utils/lib/objectid-set');

var NO_REACTIONS = Object.freeze({});

function resolveKey(item) {
  /*
   * Since IDS are unique across collections we
   * can choose the highest priority id
   * instead of concatentating them, since this is
   * much faster...
   */
  if (item.commentId) {
    return item.commentId;
  }

  if (item.replyId) {
    return item.replyId;
  }

  if (item.topicId) {
    return item.topicId;
  }

  // Should never get here..
  return 'null';
}

function ReactionVisitor(results) {
  if (!results) return;

  this.resultsHash = results && _.reduce(results, function(memo, item) {
    var key = resolveKey(item);
    var reaction = item.reaction;

    var h = memo[key];
    if (!h) {
      h = memo[key] = {};
    }

    h[reaction] = true;

    return memo;
  }, {});
}

ReactionVisitor.prototype.getReactions = function(item) {
  if (!this.resultsHash) return NO_REACTIONS;

  var key = resolveKey(item);
  var v = this.resultsHash[key];

  return v || NO_REACTIONS;
}

function createQueryForTopics(userId, forumObjects) {
  if (forumObjects.length === 1) {
    var f0 = forumObjects[0];

    return {
      userId: userId,
      topicId: f0.topicId,
      replyId: { $eq: null },
      commentId: { $eq: null }
    }
  }

  var topicIdSet = new ObjectIDSet();

  _.forEach(forumObjects, function(forumRef) {
    topicIdSet.add(forumRef.topicId);
  });

  var topicIds = topicIdSet.uniqueIds();

  return {
    userId: userId,
    topicId: topicIds.length === 1 ? topicIds[0] : { $in: topicIds },
    replyId: { $eq: null },
    commentId: { $eq: null }
  }
}

function createQueryForReplies(userId, forumObjects) {
  if (forumObjects.length === 1) {
    var f0 = forumObjects[0]
    return {
      userId: userId,
      replyId: f0.replyId,
      commentId: { $eq: null }
    }
  }

  var replyIdSet = new ObjectIDSet();

  _.forEach(forumObjects, function(forumRef) {
    replyIdSet.add(forumRef.replyId);
  });

  var replyIds = replyIdSet.uniqueIds();

  return {
    userId: userId,
    replyId: replyIds.length === 1 ? replyIds[0] : { $in: replyIds },
    commentId: { $eq: null },
  }
}

function createQueryForComments(userId, forumObjects) {
  if (forumObjects.length === 1) {
    var f0 = forumObjects[0]
    return {
      userId: userId,
      commentId: f0.commentId
    }
  }

  // Probably no reason to unique the commentIds
  var commentIds = _.map(forumObjects, function(forumRef) {
    return forumRef.commentId;
  });

  return {
    userId: userId,
    commentId: commentIds.length === 1 ? commentIds[0] : { $in: commentIds },
  }
}

function createQuery(userId, type, forumObjects) {
  switch(type) {
    case ForumObject.TYPE.Topic:
      return createQueryForTopics(userId, forumObjects);

    case ForumObject.TYPE.Reply:
      return createQueryForReplies(userId, forumObjects);

    case ForumObject.TYPE.Comment:
      return createQueryForComments(userId, forumObjects);
  }
}

function createReactionVisitor(userId, type, forumObjects) {
  if (!forumObjects.length) {
    return new ReactionVisitor();
  }

  assert(type !== ForumObject.TYPE.Forum, 'Cannot react to a forum');

  var query = createQuery(userId, type, forumObjects);

  return ForumReaction.find(query, { _id: 0, topicId: 1, replyId: 1, commentId: 1, reaction: 1 })
    .lean()
    .exec()
    .then(function(results) {
      return new ReactionVisitor(results);
    });
}

module.exports = Promise.method(createReactionVisitor);
