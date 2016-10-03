'use strict';

var reactionVisitorFactory = require('gitter-web-topic-reactions/lib/reaction-visitor');
var ForumObject = require('gitter-web-topic-models/lib/forum-object');

function ReplySubscriptionStrategy(options) {
  this.reactionVisitor = null;
  this.currentUserId = options && options.currentUserId;
}

ReplySubscriptionStrategy.prototype = {
  preload: function(replies) {
    if (!this.currentUserId) {
      return;
    }

    var forumObjects = replies.map(function(reply) {
      return ForumObject.createForReply(reply.forumId, reply.topicId, reply._id);
    });

    return reactionVisitorFactory(this.currentUserId, ForumObject.TYPE.Reply, forumObjects.toArray())
      .bind(this)
      .then(function(reactionVisitor) {
        this.reactionVisitor = reactionVisitor;
      });
  },

  map: function(reply) {
    if (!this.reactionVisitor) return {};

    var forumObject = ForumObject.createForReply(reply.forumId, reply.topicId, reply._id);
    return this.reactionVisitor.getReactions(forumObject);
  },

  name: 'ReplySubscriptionStrategy'
};


module.exports = ReplySubscriptionStrategy;
