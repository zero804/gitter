'use strict';

var env = require('gitter-web-env');
var stats = env.stats;
var Reply = require('gitter-web-persistence').Reply;
var debug = require('debug')('gitter:app:topics:reply-service');

function createReply(user, topic, replyInfo) {
  var insertData = {
    forumId: topic.forumId,
    topicId: topic._id,
    userId: user._id,
    text: replyInfo.text || '',
    html: replyInfo.html || ''
  };
  return Reply.create(insertData)
    .then(function(reply) {
      stats.event('new_reply', {
        userId: user._id,
        forumId: topic.forumId,
        topicId: topic._id,
        replyId: reply._id
      });

      return reply;
    });
}

module.exports = {
  createReply: createReply
};
