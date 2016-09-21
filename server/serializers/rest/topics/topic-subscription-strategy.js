'use strict';

var subscriberService = require('gitter-web-topic-notifications/lib/subscriber-service');
var ForumObject = require('gitter-web-topic-notifications/lib/forum-object');

function TopicSubscriptionStrategy(options) {
  this.subscriptionVisitor = null;
  this.currentUserId = options && options.currentUserId;
}

TopicSubscriptionStrategy.prototype = {
  preload: function(topics) {
    if (!this.currentUserId) {
      return;
    }

    var forumObjects = topics.map(function(topic) {
      return ForumObject.createForTopic(topic.forumId, topic._id);
    });

    return subscriberService.createSubscriptionVisitorForUser(this.currentUserId, ForumObject.TYPE.Topic, forumObjects.toArray())
      .bind(this)
      .then(function(subscriptionVisitor) {
        this.subscriptionVisitor = subscriptionVisitor;
      });
  },

  map: function(topic) {
    if (!this.subscriptionVisitor) return false;

    var forumObject = ForumObject.createForTopic(topic.forumId, topic._id);
    return this.subscriptionVisitor.isSubscribed(forumObject);
  },

  name: 'TopicSubscriptionStrategy'
};


module.exports = TopicSubscriptionStrategy;
