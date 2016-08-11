"use strict";

var Promise = require('bluebird');
var getVersion = require('../get-model-version');
var ForumCategoryIdStrategy = require('./forum-category-id-strategy');
var UserIdStrategy = require('./user-id-strategy');

function formatDate(d) {
  return d ? d.toISOString() : null;
}

function TopicStrategy(options) {
  options = options || {};

  // useLookups will be set to true if there are any lookups that this strategy
  // understands.
  var useLookups = false;
  var userLookups;
  var categoryLookups;
  if (options.lookups) {
    if (options.lookups.indexOf('user') !== -1) {
      useLookups = true;
      userLookups = {};
    }
    if (options.lookups.indexOf('category') !== -1) {
      useLookups = true;
      categoryLookups = {};
    }
  }

  var userStrategy;
  var categoryStrategy;

  this.preload = function(topics) {
    if (topics.isEmpty()) return;

    var strategies = [];

    // TODO: no user strategy necessary if options.user is passed in
    userStrategy = new UserIdStrategy();
    var userIds = topics.map(function(i) { return i.userId; });
    strategies.push(userStrategy.preload(userIds));

    // TODO: no category strategy necessary if options.category is passed in
    categoryStrategy = new ForumCategoryIdStrategy();
    var categoryIds = topics.map(function(i) { return i.categoryId; });
    strategies.push(categoryStrategy.preload(categoryIds));

    return Promise.all(strategies);
  };

  function mapCategory(categoryId) {
    if (categoryLookups) {
      if (!categoryLookups[categoryId]) {
        categoryLookups[categoryId] = categoryStrategy.map(categoryId);
      }

      return categoryId;
    } else {
      return categoryStrategy.map(categoryId);
    }
  }

  function mapUser(userId) {
    if (userLookups) {
      if (!userLookups[userId]) {
        userLookups[userId] = userStrategy.map(userId);
      }

      return userId;
    } else {
      return userStrategy.map(userId);
    }
  }

  this.map = function(topic) {
    var id = topic.id || topic._id && topic._id.toHexString();

    return {
      id: id,
      title: topic.title,
      slug: topic.slug,
      text: topic.text,
      html: topic.html,
      sticky: topic.sticky,
      tags: topic.tags,
      // TODO: support options.category
      category: mapCategory(topic.categoryId),
      // TODO: support options.user
      user: mapUser(topic.userId),
      sent: formatDate(topic.sent),
      editedAt: topic.editedAt ? formatDate(topic.editedAt) : null,
      lastModified: topic.lastModified ? formatDate(topic.lastModified) : null,
      v: getVersion(topic),
      // TODO: fill out the unimplemented fake fields
      // TODO: what about (sample) replies?
    };
  };

  this.postProcess = function(serialized) {
    if (useLookups) {
      return {
        items: serialized.toArray(),
        lookups: {
          users: userLookups,
          categories: categoryLookups
        }
      };
    } else {
      return serialized.toArray();
    }
  }
}

TopicStrategy.prototype = {
  name: 'TopicStrategy',
};

module.exports = TopicStrategy;
