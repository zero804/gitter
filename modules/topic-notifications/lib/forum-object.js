'use strict';

var assert = require('assert');

var TYPE = {
  Forum: {
  },
  Topic: {
  },
  Reply: {
  },
  Comment: {
  }
}

function ForumObject(type, forumId, topicId, replyId, commentId) {
  this.type = type;
  this.forumId = forumId;
  this.topicId = topicId;
  this.replyId = replyId;
  this.commentId = commentId;
}

ForumObject.prototype = {
  getParent: function() {
    switch(this.type) {
      case TYPE.Forum:
        assert.ok(false, 'Cannot call getParent on a forum');
        return;

      case TYPE.Topic:
        return ForumObject.createForForum(this.forumId);

      case TYPE.Reply:
        return ForumObject.createForTopic(this.forumId, this.topicId);

      case TYPE.Comment:
        return ForumObject.createForReply(this.forumId, this.topicId, this.replyId);

      default:
        assert.ok(false, 'Unknown type');
    }
  }
}

/*
 * Statics
 */

ForumObject.TYPE = TYPE;

ForumObject.createForForum = function(forumId) {
  assert(forumId, 'forumId required');
  return new ForumObject(TYPE.Forum, forumId, null, null, null);
}

ForumObject.createForTopic = function(forumId, topicId) {
  assert(forumId, 'forumId required');
  assert(topicId, 'topicId required');
  return new ForumObject(TYPE.Topic, forumId, topicId, null, null);
}

ForumObject.createForReply = function(forumId, topicId, replyId) {
  assert(forumId, 'forumId required');
  assert(topicId, 'topicId required');
  assert(replyId, 'replyId required');

  return new ForumObject(TYPE.Reply, forumId, topicId, replyId, null);
}

ForumObject.createForComment = function(forumId, topicId, replyId, commentId) {
  assert(forumId, 'forumId required');
  assert(topicId, 'topicId required');
  assert(replyId, 'replyId required');
  assert(commentId, 'commentId required');

  return new ForumObject(TYPE.Comment, forumId, topicId, replyId, commentId);
}

module.exports = ForumObject;
