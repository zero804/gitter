'use strict';

var ForumObject = require('./forum-object');
var subscriberService = require('./subscriber-service');
var notificationService = require('./notification-service');

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
    })
    .tap(function(userIds) {
      return notificationService.createNotifications(topicRef, userIds);
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
    })
    .tap(function(userIds) {
      return notificationService.createNotifications(replyRef, userIds);
    });
}

/**
 * Called when a new comment is created
 */
function createComment(comment) {
  var replyRef = ForumObject.createForReply(comment.forumId, comment.topicId, comment.replyId);
  var commentRef = ForumObject.createForComment(comment.forumId, comment.topicId, comment.replyId, comment._id);

  var authorUserId = comment.userId;
  return subscriberService.addSubscriber(replyRef, authorUserId)
    .bind({
      authorUserId: authorUserId
    })
    .then(function() {
      return subscriberService.listForItem(replyRef, { exclude: this.authorUserId });
    })
    .tap(function(userIds) {
      return notificationService.createNotifications(commentRef, userIds);
    });

}

module.exports = {
  createTopic: createTopic,
  createReply: createReply,
  createComment: createComment,
}
