'use strict';

var env = require('gitter-web-env');
var stats = env.stats;
var Promise = require('bluebird');
var StatusError = require('statuserror');
var Reply = require('gitter-web-persistence').Reply;
var debug = require('debug')('gitter:app:topics:reply-service');
var processText = require('gitter-web-text-processor');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var markdownMajorVersion = require('gitter-markdown-processor').version.split('.')[0];
var validators = require('gitter-web-validators');


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

function findByIdForForumAndTopic(forumId, topicId, replyId) {
  return findById(replyId)
    .then(function(reply) {
      if (!reply) return null;

      // make sure the reply is in the specified forum
      if (!mongoUtils.objectIDsEqual(reply.forumId, forumId)) return null;

      // make sure the reply is in the specified topic
      if (!mongoUtils.objectIDsEqual(reply.topicId, topicId)) return null;

      return reply;
    });
}

function validateReply(data) {
  if (!validators.validateMarkdown(data.text)) {
    throw new StatusError(400, 'Text is invalid.')
  }

  return data;
}

function createReply(user, topic, options) {
  var data = {
    forumId: topic.forumId,
    topicId: topic._id,
    userId: user._id,
    text: options.text || '',
  };

  return Promise.try(function() {
      return validateReply(data);
    })
    .bind({})
    .then(function(insertData) {
      this.insertData = insertData;
      return processText(options.text);
    })
    .then(function(parsedMessage) {
      var data = this.insertData;

      data.html = parsedMessage.html;
      data.lang = parsedMessage.lang;
      data._md = parsedMessage.markdownProcessingFailed ? -markdownMajorVersion : markdownMajorVersion;

      return Reply.create(data);
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
  findByIdForForumAndTopic: findByIdForForumAndTopic,
  createReply: createReply
};
