'use strict';

var env = require('gitter-web-env');
var stats = env.stats;
var Promise = require('bluebird');
var Topic = require('gitter-web-persistence').Topic;
var Reply = require('gitter-web-persistence').Reply;
var processText = require('gitter-web-text-processor');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var mongooseUtils = require('gitter-web-persistence-utils/lib/mongoose-utils');
var markdownMajorVersion = require('gitter-markdown-processor').version.split('.')[0];
var validateReply = require('./validate-reply');


function findById(replyId) {
  return Reply.findById(replyId)
    .lean()
    .exec();
}

// TODO: we'll need better ways to get pages of reply results per topic rather
// than this function to just get all of it.
function findByTopicId(id) {
  return Reply.find({ topicId: id })
    .lean()
    .exec();
}

function findByTopicIds(ids) {
  if (!ids.length) return [];

  return Reply.find({ topicId: { $in: ids } })
    .lean()
    .exec();
}

function findTotalsByTopicIds(ids) {
  return mongooseUtils.getEstimatedCountForIds(Reply, 'topicId', ids);
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

function updateLastModifiedForTopic(topicId) {
  // Load the topic again to get a fat object so we can call save() on it
  return Topic.findById(topicId)
    .exec()
    .then(function(fatTopic) {
      if (!fatTopic) return;

      // Use mongoose's save event to update the topic's last modified value so
      // that it will fire a persistence event for the live collections.
      // For now.
      fatTopic.lastModified = new Date();
      return fatTopic.save();
    });
}

function createReply(user, topic, options) {
  var data = {
    forumId: topic.forumId,
    topicId: topic._id,
    userId: user._id,
    text: options.text || '',
  };

  var insertData = validateReply(data);
  return processText(options.text)
    .then(function(parsedMessage) {
      insertData.html = parsedMessage.html;
      insertData.lang = parsedMessage.lang;
      insertData._md = parsedMessage.markdownProcessingFailed ? -markdownMajorVersion : markdownMajorVersion;

      return Reply.create(insertData);
    })
    .bind({
      reply: undefined
    })
    .then(function(reply) {
      this.reply = reply;

      return updateLastModifiedForTopic(topic._id);
    })

    .then(function() {
      var reply = this.reply;

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
  findByTopicId: findByTopicId,
  findByTopicIds: findByTopicIds,
  findTotalsByTopicIds: findTotalsByTopicIds,
  findByIdForForum: findByIdForForum,
  findByIdForForumAndTopic: findByIdForForumAndTopic,
  createReply: Promise.method(createReply)
};
