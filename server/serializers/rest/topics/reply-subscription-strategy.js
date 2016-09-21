'use strict';

var subscriberService = require('gitter-web-topic-notifications/lib/subscriber-service');
var ForumObject = require('gitter-web-topic-notifications/lib/forum-object');

function ReplySubscriptionStrategy(options) {
  this.subscriptionVisitor = null;
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

    return subscriberService.createSubscriptionVisitorForUser(this.currentUserId, ForumObject.TYPE.Reply, forumObjects.toArray())
      .bind(this)
      .then(function(subscriptionVisitor) {
        this.subscriptionVisitor = subscriptionVisitor;
      });
  },

  map: function(reply) {
    if (!this.subscriptionVisitor) return false;

    var forumObject = ForumObject.createForReply(reply.forumId, reply.topicId, reply._id);
    return this.subscriptionVisitor.isSubscribed(forumObject);
  },

  name: 'ReplySubscriptionStrategy'
};


module.exports = ReplySubscriptionStrategy;
