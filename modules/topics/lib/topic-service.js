'use strict';

var env = require('gitter-web-env');
var stats = env.stats;
var Topic = require('gitter-web-persistence').Topic;
var debug = require('debug')('gitter:app:topics:topic-service');

function createTopic(user, category, topicInfo) {
  // we can't upsert because there's nothing unique on a Topic to check against
  var insertData = {
    forumId: category.forumId,
    categoryId: category._id,
    userId: user._id,
    title: topicInfo.title,
    slug: topicInfo.slug,
    tags: topicInfo.tags || [],
    sticky: topicInfo.sticky || false,
    text: topicInfo.text || '',
    html: topicInfo.html || ''
  };
  return Topic.create(insertData)
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
