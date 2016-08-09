'use strict';

var env = require('gitter-web-env');
var stats = env.stats;
var Reply = require('gitter-web-persistence').Reply;
var debug = require('debug')('gitter:app:topics:reply-service');
var processText = require('gitter-web-text-processor');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var markdownMajorVersion = require('gitter-markdown-processor').version.split('.')[0];


function findById(replyId) {
  return Reply.findById(replyId)
    .lean()
    .exec();
}

function findByIdForForum(forumId, replyId) {
  return findById(replyId)
    .then(function(reply) {
      if (!reply) return null;

      // make sure the reply is in the specified forum
      if (!mongoUtils.objectIDsEqual(reply.forumId, forumId)) return null;

      return reply;
    });
}

function createReply(user, topic, options) {
  return processText(options.text)
    .then(function(parsedMessage) {
      var insertData = {
        forumId: topic.forumId,
        topicId: topic._id,
        userId: user._id,
        text: options.text || '',
        html: parsedMessage.html,
        lang: parsedMessage.lang,
        _md: parsedMessage.markdownProcessingFailed ? -markdownMajorVersion : markdownMajorVersion
      };

      return Reply.create(insertData);
    })
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
  findById: findById,
  findByIdForForum: findByIdForForum,
  createReply: createReply
};
