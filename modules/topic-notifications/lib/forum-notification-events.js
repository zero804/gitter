'use strict';

var env = require('gitter-web-env');
var logger = env.logger.get('topic-notifications');

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

      logger.info('New Topic', {
        forumId: topic.forumId,
        authorUserId: this.authorUserId,
        notificationCount: userIds.length
      });

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
      logger.info('New Reply', {
        forumId: reply.forumId,
        topicId: reply.topicId,
        authorUserId: this.authorUserId,
        notificationCount: userIds.length
      });

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
      logger.info('New Comment', {
        forumId: comment.forumId,
        topicId: comment.topicId,
        replyId: comment.replyId,
        authorUserId: this.authorUserId,
        notificationCount: userIds.length
      });

      return notificationService.createNotifications(commentRef, userIds);
    });

}

module.exports = {
  createTopic: createTopic,
  createReply: createReply,
  createComment: createComment,
}
