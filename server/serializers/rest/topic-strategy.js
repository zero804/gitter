"use strict";

var Promise = require('bluebird');
var getVersion = require('../get-model-version');
var ForumCategoryIdStrategy = require('./forum-category-id-strategy');
var RepliesForTopicStrategy = require('./topics/replies-for-topic-strategy');
var RepliesTotalsForTopicStrategy = require('./topics/replies-totals-for-topic-strategy');
var TopicReplyingUsersStrategy = require('./topics/topic-replying-users-strategy');
var UserIdStrategy = require('./user-id-strategy');

function formatDate(d) {
  return d ? d.toISOString() : null;
}

function getId(obj) {
  return obj._id || obj.id;
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

  // var repliesMap;
  // var repliesTotalMap;
  var repliesForTopicStrategy;
  var repliesTotalsForTopicStrategy;
  var replyingUsersStrategy;

  this.preload = function(topics) {
    if (topics.isEmpty()) return;

    var topicIds = topics.map(getId);

    var strategies = [];

    // load replies
    if (options.includeReplies) {
      repliesForTopicStrategy = new RepliesForTopicStrategy();
      strategies.push(repliesForTopicStrategy.preload(topicIds));
    }

    // load replyTotals
    if (options.includeRepliesTotals) {
      repliesTotalsForTopicStrategy = new RepliesTotalsForTopicStrategy();
      strategies.push(repliesTotalsForTopicStrategy.preload(topicIds));
    }

    // load replyingUsers
    if (options.includeReplyingUsers) {
      replyingUsersStrategy = new TopicReplyingUsersStrategy();
      strategies.push(replyingUsersStrategy.preload(topicIds));
    }

    // TODO: no user strategy necessary if options.user is passed in
    userStrategy = UserIdStrategy.slim();
    var userIds = topics.map(function(i) { return i.userId; });
    strategies.push(userStrategy.preload(userIds));

    // TODO: no category strategy necessary if options.category is passed in
    // TODO: support options.categories for when called from ForumStrategy?
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
      replies: repliesForTopicStrategy ? repliesForTopicStrategy.map(id) : undefined,
      repliesTotal: repliesTotalsForTopicStrategy ? repliesTotalsForTopicStrategy.map(id) : undefined,
      replyingUsers: replyingUsersStrategy ? replyingUsersStrategy.map(id): undefined,

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

TopicStrategy.full = function() {
  return new TopicStrategy({
    includeReplyingUsers: true,
    includeReplies: true,
    includeRepliesTotals: true
  })
}

TopicStrategy.standard = function() {
  return new TopicStrategy({
    includeReplyingUsers: true,
    includeReplies: false,
    includeRepliesTotals: true
  })
}

module.exports = TopicStrategy;
