'use strict';

var subscriberService = require('gitter-web-topic-notifications/lib/subscriber-service');
var ForumObject = require('gitter-web-topic-notifications/lib/forum-object');

function ForumSubscriptionStrategy(options) {
  this.subscriptionVisitor = null;
  this.currentUserId = options && options.currentUserId;
}

ForumSubscriptionStrategy.prototype = {
  preload: function(forums) {
    if (!this.currentUserId) {
      return;
    }

    var forumObjects = forums.map(function(forum) {
      return ForumObject.createForForum(forum._id);
    });

    return subscriberService.isUserSubscribed(this.currentUserId, ForumObject.TYPE.Forum, forumObjects.toArray())
      .bind(this)
      .then(function(subscriptionVisitor) {
        this.subscriptionVisitor = subscriptionVisitor;
      });
  },

  map: function(forum) {
    if (!this.subscriptionVisitor) return false;

    var forumObject = ForumObject.createForForum(forum._id);
    return this.subscriptionVisitor.isSubscribed(forumObject);
  },

  name: 'ForumSubscriptionStrategy'
};


module.exports = ForumSubscriptionStrategy;
