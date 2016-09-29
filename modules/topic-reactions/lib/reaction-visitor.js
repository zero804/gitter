'use strict';

var Promise = require('bluebird');
var ForumReaction = require('gitter-web-persistence').ForumReaction;
var ForumObject = require('gitter-web-topic-models/lib/forum-object');
var assert = require('assert');
var _ = require('lodash');
var ObjectIDSet = require('gitter-web-persistence-utils/lib/objectid-set');

function resolveKey(item) {
  if (item.commentId) {
    return item.commentId;
  }

  if (item.replyId) {
    return item.replyId;
  }

  if (item.topicId) {
    return item.topicId;
  }

  if (item.forumId) {
    return item.forumId;
  }

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

ReactionVisitor.prototype.isSubscribed = function(item) {
  if (!this.resultsHash) return {};

  var key = resolveKey(item);
  return this.resultsHash[key] || {};
}

function createQueryForTopics(forumObjects) {
  if (forumObjects.length === 0) {
    return {
      forumId: { $in: [] }
    }
  }

  if (forumObjects.length === 1) {
    var f0 = forumObjects[0]
    return {
      forumId: f0.forumId,
      topicId: f0.topicId,
      replyId: { $eq: null },
      commentId: { $eq: null }
    }
  }

  var forumIdSet = new ObjectIDSet();
  var topicIdSet = new ObjectIDSet();

  _.forEach(forumObjects, function(forumRef) {
    forumIdSet.add(forumRef.forumId);
    topicIdSet.add(forumRef.topicId);
  });

  var forumIds = forumIdSet.uniqueIds();
  var topicIds = topicIdSet.uniqueIds();

  return {
    forumId: forumIds.length === 1 ? forumIds[0] : { $in: forumIds },
    topicId: topicIds.length === 1 ? topicIds[0] : { $in: topicIds },
    replyId: { $eq: null },
    commentId: { $eq: null }
  }
}

function createQueryForReplies(forumObjects) {
  if (forumObjects.length === 0) {
    return {
      forumId: { $in: [] }
    }
  }

  if (forumObjects.length === 1) {
    var f0 = forumObjects[0]
    return {
      forumId: f0.forumId,
      topicId: f0.topicId,
      replyId: f0.replyId,
      commentId: { $eq: null }
    }
  }

  var forumIdSet = new ObjectIDSet();
  var topicIdSet = new ObjectIDSet();
  var replyIdSet = new ObjectIDSet();

  _.forEach(forumObjects, function(forumRef) {
    forumIdSet.add(forumRef.forumId);
    topicIdSet.add(forumRef.topicId);
    replyIdSet.add(forumRef.replyId);
  });

  var forumIds = forumIdSet.uniqueIds();
  var topicIds = topicIdSet.uniqueIds();
  var replyIds = replyIdSet.uniqueIds();

  return {
    forumId: forumIds.length === 1 ? forumIds[0] : { $in: forumIds },
    topicId: topicIds.length === 1 ? topicIds[0] : { $in: topicIds },
    replyId: replyIds.length === 1 ? replyIds[0] : { $in: replyIds },
    commentId: { $eq: null },
  }
}

function createQueryForComments(forumObjects) {
  if (forumObjects.length === 0) {
    return {
      forumId: { $in: [] }
    }
  }

  if (forumObjects.length === 1) {
    var f0 = forumObjects[0]
    return {
      forumId: f0.forumId,
      topicId: f0.topicId,
      replyId: f0.replyId,
      commentId: f0.commentId
    }
  }

  var forumIdSet = new ObjectIDSet();
  var topicIdSet = new ObjectIDSet();
  var replyIdSet = new ObjectIDSet();
  var commentIds = [];

  _.forEach(forumObjects, function(forumRef) {
    forumIdSet.add(forumRef.forumId);
    topicIdSet.add(forumRef.topicId);
    replyIdSet.add(forumRef.replyId);
    commentIds.push(forumRef.commentId);
  });

  var forumIds = forumIdSet.uniqueIds();
  var topicIds = topicIdSet.uniqueIds();
  var replyIds = replyIdSet.uniqueIds();

  return {
    forumId: forumIds.length === 1 ? forumIds[0] : { $in: forumIds },
    topicId: topicIds.length === 1 ? topicIds[0] : { $in: topicIds },
    replyId: replyIds.length === 1 ? replyIds[0] : { $in: replyIds },
    commentIds: commentIds.length === 1 ? commentIds[0] : { $in: commentIds },
  }
}

function createQuery(type, forumObjects) {
  switch(type) {
    case ForumObject.TYPE.Topic:
      return createQueryForTopics(forumObjects);

    case ForumObject.TYPE.Reply:
      return createQueryForReplies(forumObjects);

    case ForumObject.TYPE.Comment:
      return createQueryForComments(forumObjects);
  }
}

function createReactionVisitor(userId, type, forumObjects) {
  if (!forumObjects.length) {
    return new ReactionVisitor();
  }

  assert(type !== ForumObject.TYPE.Forum);

  var query = createQuery(type, forumObjects);
  query.userId = userId;

  return ForumReaction.find(query, { _id: 0, forumId: 1, topicId: 1, replyId: 1, reaction: 1 })
    .lean()
    .exec()
    .then(function(results) {
      return new ReactionVisitor(results);
    });
}

module.exports = Promise.method(createReactionVisitor);
