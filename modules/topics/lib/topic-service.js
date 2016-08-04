'use strict';

var env = require('gitter-web-env');
var stats = env.stats;
var Topic = require('gitter-web-persistence').Topic;
var debug = require('debug')('gitter:app:topics:topic-service');
var processText = require('gitter-web-text-processor');
var markdownMajorVersion = require('gitter-markdown-processor').version.split('.')[0];


function createTopic(user, category, options) {
  return processText(options.text)
    .then(function(parsedMessage) {
      var insertData = {
        forumId: category.forumId,
        categoryId: category._id,
        userId: user._id,
        title: options.title,
        slug: options.slug,
        tags: options.tags || [],
        sticky: options.sticky || false,
        text: options.text || '',
        html: parsedMessage.html,
        lang: parsedMessage.lang,
        _md: parsedMessage.markdownProcessingFailed ? -markdownMajorVersion : markdownMajorVersion
        // urls, issues, mentions?
      };

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

module.exports = {
  createTopic: createTopic
};
