'use strict';

var env = require('gitter-web-env');
var stats = env.stats;
var Promise = require('bluebird');
var StatusError = require('statuserror');
var Topic = require('gitter-web-persistence').Topic;
var debug = require('debug')('gitter:app:topics:topic-service');
var processText = require('gitter-web-text-processor');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var mongooseUtils = require('gitter-web-persistence-utils/lib/mongoose-utils');
var markdownMajorVersion = require('gitter-markdown-processor').version.split('.')[0];
var validateTopic = require('./validate-topic');
var validateTags = require('gitter-web-validators').validateTags;
var liveCollections = require('gitter-web-live-collection-events');


function findById(topicId) {
  return Topic.findById(topicId)
    .lean()
    .exec();
}

// TODO: we'll need better ways to get pages of topic results per forum rather
// than this function to just get all the topics.
function findByForumId(id) {
  return Topic.find({ forumId: id })
    .lean()
    .exec();
}

function findByForumIds(ids) {
  if (!ids.length) return [];

  return Topic.find({ forumId: { $in: ids } })
    .lean()
    .exec();
}

function findTotalsByForumIds(ids, options) {
  options = options || {};

  return mongooseUtils.getEstimatedCountForIds(Topic, 'forumId', ids, {
    read: options.read
  });
}

function findByIdForForum(forumId, topicId) {
  return findById(topicId)
    .then(function(topic) {
      if (!topic) return null;

      // make sure the topic is in the specified forum
      if (!mongoUtils.objectIDsEqual(topic.forumId, forumId)) return null;

      return topic;
    });
}


function createTopic(user, category, options) {
  // these should be passed in from forum.tags
  var allowedTags = options.allowedTags || [];

  var data = {
    forumId: category.forumId,
    categoryId: category._id,
    userId: user._id,
    title: options.title,
    slug: options.slug,
    tags: options.tags || [],
    sticky: options.sticky || false,
    text: options.text || '',
  };

  var insertData = validateTopic(data, { allowedTags: allowedTags });

  // make these all be the exact same instant
  insertData.sent = insertData.lastChanged = insertData.lastModified = new Date();

  return processText(options.text)
    .then(function(parsedMessage) {
      insertData.html = parsedMessage.html;
      insertData.lang = parsedMessage.lang;
      insertData._md = parsedMessage.markdownProcessingFailed ? -markdownMajorVersion : markdownMajorVersion;
      // urls, issues, mentions?

      debug("Creating topic with %j", insertData);

      return Topic.create(insertData);
    })
    .then(function(topic) {
      stats.event('new_topic', {
        userId: user._id,
        forumId: category.forumId,
        topicId: topic._id,
      });

      return topic;
    });
}

function setTopicTags(user, topic, tags, options) {
  tags = tags || [];

  options = options || {};
  // alternatively we could have passed a full forum object just to get to
  // forum.tags
  options.allowedTags = options.allowedTags || [];

  if (!validateTags(tags, options.allowedTags)) {
    throw new StatusError(400, 'Tags are invalid.');
  }

  var userId = user._id;
  var forumId = topic.forumId;
  var topicId = topic._id;

  var query = {
    _id: topicId
  };
  var update = {
    $set: {
      tags: tags
    }
  };
  return Topic.findOneAndUpdate(query, update, { new: true })
    .lean()
    .exec()
    .then(function(updatedTopic) {
      // log a stats event
      stats.event('update_topic_tags', {
        userId: userId,
        forumId: forumId,
        topicId: topicId,
        tags: tags
      });

      liveCollections.topics.emit('patch', forumId, topicId, { tags: updatedTopic.tags });

      return updatedTopic;
    });
}

module.exports = {
  findById: findById,
  findByForumId: findByForumId,
  findByForumIds: Promise.method(findByForumIds),
  findTotalsByForumIds: Promise.method(findTotalsByForumIds),
  findByIdForForum: findByIdForForum,
  createTopic: Promise.method(createTopic),
  setTopicTags: Promise.method(setTopicTags)
};
