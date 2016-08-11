'use strict';

var env = require('gitter-web-env');
var stats = env.stats;
var Promise = require('bluebird');
var StatusError = require('statuserror');
var Topic = require('gitter-web-persistence').Topic;
var debug = require('debug')('gitter:app:topics:topic-service');
var processText = require('gitter-web-text-processor');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var markdownMajorVersion = require('gitter-markdown-processor').version.split('.')[0];
var validators = require('gitter-web-validators');


function findById(topicId) {
  return Topic.findById(topicId)
    .lean()
    .exec();
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

function validateTopic(data, options) {
  options = options || {};
  options.allowedTags = options.allowedTags || [];

  if (!validators.validateDisplayName(data.title)) {
    throw new StatusError(400, 'Title is invalid.')
  }

  if (!validators.validateSlug(data.slug)) {
    throw new StatusError(400, 'Slug is invalid.')
  }

  if (!validators.validateMarkdown(data.text)) {
    throw new StatusError(400, 'Text is invalid.')
  }

  // TODO: validate data.tags against options.allowedTags

  return data;
}

function createTopic(user, category, options) {
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

  return Promise.try(function() {
      return validateTopic(data, {
        // TODO: somehow either pass in the forum's tags or read them out
        //allowedTags: forum.tags
      });
    })
    .bind({})
    .then(function(insertData) {
      this.insertData = insertData;
      return processText(options.text)
    })
    .then(function(parsedMessage) {
      var data = this.insertData;

      data.html = parsedMessage.html;
      data.lang = parsedMessage.lang;
      data._md = parsedMessage.markdownProcessingFailed ? -markdownMajorVersion : markdownMajorVersion;
      // urls, issues, mentions?

      return Topic.create(data);
    })
    .then(function(topic) {
      // TODO: this should be moved to the integration service rather
      stats.event('new_topic', {
        userId: user._id,
        forumId: category.forumId,
        topicId: topic._id,
      });

      return topic;
    });
}

module.exports = {
  findById: findById,
  findByIdForForum: findByIdForForum,
  createTopic: createTopic
};
