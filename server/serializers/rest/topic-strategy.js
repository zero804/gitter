"use strict";

var Promise = require('bluebird');
var Lazy = require('lazy.js');
var _ = require('lodash');
var getVersion = require('../get-model-version');
var ForumCategoryIdStrategy = require('./forum-category-id-strategy');
var ReplyStrategy = require('./reply-strategy');
var UserIdStrategy = require('./user-id-strategy');
var replyService = require('gitter-web-topics/lib/reply-service');


function formatDate(d) {
  return d ? d.toISOString() : null;
}

function getIdString(obj) {
  return obj.id || obj._id && obj._id.toHexString();
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
  var replyStrategy;

  var repliesMap;
  var repliesTotalMap;

  this.preload = function(topics) {
    if (topics.isEmpty()) return;

    var topicIds = topics.map(getIdString).toArray();

    var strategies = [];

    return Promise.try(function() {
        // load replies
        if (options.includeReplies) {
          return replyService.findByTopicIds(topicIds)
            .then(function(replies) {
              repliesMap = _.groupBy(replies, 'topicId');

              replyStrategy = new ReplyStrategy();
              strategies.push(replyStrategy.preload(Lazy(replies)));
            });
        }
      })
      .then(function() {
        // load replyTotals
        if (options.includeRepliesTotals) {
          return replyService.findTotalsByTopicIds(topicIds)
            .then(function(repliesTotals) {
              repliesTotalMap = repliesTotals;
            });
        }
      })
      .then(function() {
        // TODO: no user strategy necessary if options.user is passed in
        userStrategy = new UserIdStrategy();
        var userIds = topics.map(function(i) { return i.userId; });
        strategies.push(userStrategy.preload(userIds));

        // TODO: no category strategy necessary if options.category is passed in
        // TODO: support options.categories for when called from ForumStrategy?
        categoryStrategy = new ForumCategoryIdStrategy();
        var categoryIds = topics.map(function(i) { return i.categoryId; });
        strategies.push(categoryStrategy.preload(categoryIds));

        return Promise.all(strategies);
      });
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

    var replies = options.includeReplies ? repliesMap[id] || [] : undefined;
    var repliesTotal = options.includeRepliesTotals ? repliesTotalMap[id] || 0 : undefined;

    return {
      id: id,
      title: topic.title,
      slug: topic.slug,
      body: {
        text: topic.text,
        html: topic.html,
      },
      sticky: topic.sticky,
      tags: topic.tags,

      // TODO: support options.category
      category: mapCategory(topic.categoryId),

      // TODO: support options.user
      user: mapUser(topic.userId),

      // don't accidentally send all the replies with all the topics when
      // serializing a forum..
      replies: options.includeReplies ? replies.map(replyStrategy.map) : undefined,
      repliesTotal: options.includeRepliesTotals ? repliesTotal : undefined,

      sent: formatDate(topic.sent),
      editedAt: topic.editedAt ? formatDate(topic.editedAt) : null,
      lastModified: topic.lastModified ? formatDate(topic.lastModified) : null,
      v: getVersion(topic),

      // TODO: participatingTotal
      // TODO: isFaved
      // TODO: isParticipating
      // TODO: isWatching
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
