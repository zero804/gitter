'use strict';

var ForumObject = require('gitter-web-topic-models/lib/forum-object');
var subscriberService = require('./subscriber-service');

/**
 * Called when a new topic is created
 */
function createTopic(topic) {
  var topicRef = ForumObject.createForTopic(topic.forumId, topic._id);

  var authorUserId = topic.userId;
  return subscriberService.addSubscriber(topicRef, topic.userId)
    .bind({
      authorUserId: authorUserId
    })
    .then(function() {
      return subscriberService.listForItem(topicRef, { exclude: this.authorUserId });
    });
}

/**
 * Called when a new reply is created
 */
function createReply(reply) {
  var replyRef = ForumObject.createForReply(reply.forumId, reply.topicId, reply._id);

  var authorUserId = reply.userId;
  return subscriberService.addSubscriber(replyRef, authorUserId)
    .bind({
      authorUserId: authorUserId
    })
    .then(function() {
      return subscriberService.listForItem(replyRef, { exclude: this.authorUserId });
    });
}

/**
 * Called when a new comment is created
 */
function createComment(comment) {
  var replyRef = ForumObject.createForReply(comment.forumId, comment.topicId, comment.replyId);

  var authorUserId = comment.userId;
  return subscriberService.addSubscriber(replyRef, authorUserId)
    .bind({
      authorUserId: authorUserId
    })
    .then(function() {
      return subscriberService.listForItem(replyRef, { exclude: this.authorUserId });
    });
}

module.exports = {
  createTopic: createTopic,
  createReply: createReply,
  createComment: createComment,
}
