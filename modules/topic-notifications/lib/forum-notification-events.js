'use strict';

var ForumObject = require('./forum-object');
var subscriberService = require('./subscriber-service');

function createTopic(topic) {
  var topicRef = ForumObject.createForTopic(topic.forumId, topic._id);

  return subscriberService.listForItem(topicRef);
    // .then(function(userIds) {
      // console.log('NOTIFY ', userIds);
    // });
}

function createReply(reply) {
  var topicRef = ForumObject.createForReply(reply.forumId, reply.topicId, reply._id);

  return subscriberService.listForItem(topicRef);
    // .then(function(userIds) {
      // console.log('NOTIFY ', userIds);
    // });
}

function createComment(comment) {
  var replyRef = ForumObject.createForReply(comment.forumId, comment.topicId, comment.replyId);

  return subscriberService.listForItem(replyRef);
    // .then(function(userIds) {
      // console.log('NOTIFY', userIds);
    // });
}

module.exports = {
  createTopic: createTopic,
  createReply: createReply,
  createComment: createComment,
}
