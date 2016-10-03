'use strict';

var reactionVisitorFactory = require('gitter-web-topic-reactions/lib/reaction-visitor');
var ForumObject = require('gitter-web-topic-models/lib/forum-object');

function TopicReactionStrategy(options) {
  this.reactionVisitor = null;
  this.currentUserId = options && options.currentUserId;
}

TopicReactionStrategy.prototype = {
  preload: function(topics) {
    if (!this.currentUserId) {
      return;
    }

    var forumObjects = topics.map(function(topic) {
      return ForumObject.createForTopic(topic.forumId, topic._id);
    });

    return reactionVisitorFactory(this.currentUserId, ForumObject.TYPE.Topic, forumObjects.toArray())
      .bind(this)
      .then(function(reactionVisitor) {
        this.reactionVisitor = reactionVisitor;
      });
  },

  map: function(topic) {
    if (!this.reactionVisitor) return {};

    var forumObject = ForumObject.createForTopic(topic.forumId, topic._id);
    return this.reactionVisitor.getReactions(forumObject);
  },

  name: 'TopicReactionStrategy'
};


module.exports = TopicReactionStrategy;
