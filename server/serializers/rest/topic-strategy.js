"use strict";

var Promise = require('bluebird');
var getVersion = require('../get-model-version');
var ForumCategoryIdStrategy = require('./forum-category-id-strategy');
var RepliesForTopicStrategy = require('./topics/replies-for-topic-strategy');
var TopicReplyingUsersStrategy = require('./topics/topic-replying-users-strategy');
var UserIdStrategy = require('./user-id-strategy');
var TopicSubscriptionStrategy = require('./topics/topic-subscription-strategy');

function formatDate(d) {
  return d ? d.toISOString() : null;
}

function getId(obj) {
  return obj._id || obj.id;
}

function TopicStrategy(options) {
  if (options.lookups) {
    if (options.lookups.indexOf('user') !== -1) {
      this.userLookups = {};
    }

    if (options.lookups.indexOf('category') !== -1) {
      this.categoryLookups = {};
    }
  }
}

TopicStrategy.prototype = {

  preload: function(topics) {
    if (topics.isEmpty()) return;

    var topicIds = topics.map(getId);

    var strategies = [];

    // load replies
    if (this.repliesForTopicStrategy) {
      strategies.push(this.repliesForTopicStrategy.preload(topicIds));
    }

    // load replyingUsers
    if (this.replyingUsersStrategy) {
      strategies.push(this.replyingUsersStrategy.preload(topicIds));
    }

    var userIds = topics.map(function(i) { return i.userId; });
    strategies.push(this.userStrategy.preload(userIds));

    var categoryIds = topics.map(function(i) { return i.categoryId; });
    strategies.push(this.categoryStrategy.preload(categoryIds));

    strategies.push(this.topicSubscriptionStrategy.preload(topics));

    return Promise.all(strategies);
  },

  mapCategory: function(categoryId) {
    if (this.categoryLookups) {
      if (!this.categoryLookups[categoryId]) {
        this.categoryLookups[categoryId] = this.categoryStrategy.map(categoryId);
      }

      return categoryId;
    } else {
      return this.categoryStrategy.map(categoryId);
    }
  },

  mapUser: function(userId) {
    if (this.userLookups) {
      if (!this.userLookups[userId]) {
        this.userLookups[userId] = this.userStrategy.map(userId);
      }

      return userId;
    } else {
      return this.userStrategy.map(userId);
    }
  },

  map: function(topic) {
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

      category: this.mapCategory(topic.categoryId),
      user: this.mapUser(topic.userId),

      subscribed: this.topicSubscriptionStrategy ? this.topicSubscriptionStrategy.map(topic) : undefined,

      replies: this.repliesForTopicStrategy ? this.repliesForTopicStrategy.map(id) : undefined,
      repliesTotal: topic.repliesTotal,
      replyingUsers: this.replyingUsersStrategy ? this.replyingUsersStrategy.map(id): undefined,

      sent: formatDate(topic.sent),
      editedAt: formatDate(topic.editedAt),
      lastChanged: formatDate(topic.lastChanged),
      lastModified: formatDate(topic.lastModified),
      v: getVersion(topic),

      // TODO: participatingTotal
      // TODO: isFaved
      // TODO: isParticipating
    };
  },

  postProcess: function(serialized) {
    if (this.userLookups || this.categoryLookups) {
      return {
        items: serialized.toArray(),
        lookups: {
          users: this.userLookups,
          categories: this.categoryLookups
        }
      };
    } else {
      return serialized.toArray();
    }
  },

  name: 'TopicStrategy',
};

/**
 * Returns topics WITHOUT any nested replies
 */
TopicStrategy.standard = function(options) {
  var currentUserId = options && options.currentUserId;

  var strategy = new TopicStrategy({
    currentUserId: currentUserId,
    includeReplyingUsers: true,
    lookups: options && options.lookups
  });

  strategy.userStrategy = UserIdStrategy.slim();
  strategy.replyingUsersStrategy = new TopicReplyingUsersStrategy();
  strategy.categoryStrategy = new ForumCategoryIdStrategy();
  strategy.topicSubscriptionStrategy = new TopicSubscriptionStrategy({
    currentUserId: currentUserId
  });

  return strategy;
}

/**
 * Returns topics with selected nested replies
 */
TopicStrategy.nested = function(options) {
  var strategy = TopicStrategy.standard(options);

  // Added nested strategies to the standard
  strategy.repliesForTopicStrategy = RepliesForTopicStrategy.standard({
    currentUserId:  options && options.currentUserId
  })

  return strategy;
}

module.exports = TopicStrategy;
