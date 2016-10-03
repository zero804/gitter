'use strict';

var reactionVisitorFactory = require('gitter-web-topic-reactions/lib/reaction-visitor');
var ForumObject = require('gitter-web-topic-models/lib/forum-object');

function CommentReactionStrategy(options) {
  this.reactionVisitor = null;
  this.currentUserId = options && options.currentUserId;
}

CommentReactionStrategy.prototype = {
  preload: function(forums) {
    if (!this.currentUserId) {
      return;
    }

    var forumObjects = forums.map(function(comment) {
      return ForumObject.createForComment(comment.forumId, comment.topicId, comment.replyId, comment._id);
    });

    return reactionVisitorFactory(this.currentUserId, ForumObject.TYPE.Comment, forumObjects.toArray())
      .bind(this)
      .then(function(reactionVisitor) {
        this.reactionVisitor = reactionVisitor;
      });
  },

  map: function(comment) {
    if (!this.reactionVisitor) return {};

    var forumObject = ForumObject.createForComment(comment.forumId, comment.topicId, comment.replyId, comment._id);
    return this.reactionVisitor.getReactions(forumObject);
  },

  name: 'CommentReactionStrategy'
};


module.exports = CommentReactionStrategy;
