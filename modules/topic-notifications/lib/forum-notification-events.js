'use strict';

var ForumObject = require('./forum-object');
var subscriberCloner = require('./subscriber-cloner');
var subscriberService = require('./subscriber-service');

function cloneSubscribersFromParent(forumObject, creatorUserId) {
  return subscriberCloner(forumObject.getParent(), forumObject, [creatorUserId]);
}

function createTopic(topic) {
  var topicRef = ForumObject.createForTopic(topic.forumId, topic._id);

  return cloneSubscribersFromParent(topicRef, topic.userId)
    // .then(function(userIds) {
      // console.log('NOTIFY ', userIds);
    // });
}

function createReply(reply) {
  var topicRef = ForumObject.createForReply(reply.forumId, reply.topicId, reply._id);

  return cloneSubscribersFromParent(topicRef, reply.userId)
    // .then(function(userIds) {
      // console.log('NOTIFY ', userIds);
    // });
}

function createComment(comment) {
  var replyRef = ForumObject.createForReply(comment.forumId, comment.topicId, comment.replyId);

  return subscriberService.listForItem(replyRef)
    // .then(function(userIds) {
      // console.log('NOTIFY', userIds);
    // });
}

module.exports = {
  createTopic: createTopic,
  createReply: createReply,
  createComment: createComment,
}
