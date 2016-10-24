"use strict";

var Promise = require('bluebird');
var CategoriesForForumStrategy = require('./topics/categories-for-forum-strategy');
var TopicsForForumStrategy = require('./topics/topics-for-forum-strategy');
var ForumSubscriptionStrategy = require('./topics/forum-subscription-strategy');
var ForumPermissionsStrategy = require('./topics/forum-permissions-strategy');


function getId(obj) {
  return obj._id || obj.id;
}

function ForumStrategy() {
}

ForumStrategy.prototype = {
  preload: function(forums) {
    if (forums.isEmpty()) return;

    var forumIds = forums.map(getId);

    var strategies = [];

    strategies.push(this.categoriesForForumStrategy.preload(forumIds));
    if (this.topicsForForumStrategy) {
      strategies.push(this.topicsForForumStrategy.preload(forumIds));
    }
    if (this.subscriptionStrategy) {
      strategies.push(this.subscriptionStrategy.preload(forums));
    }
    if (this.permissionsStrategy) {
      strategies.push(this.permissionsStrategy.preload(forums));
    }

    return Promise.all(strategies);
  },

  map: function(forum) {
    var id = forum.id || forum._id && forum._id.toHexString();

    return {
      id: id,
      name: forum.name,
      uri: forum.uri,
      tags: forum.tags,
      // TODO: we're gonna drop categories & topics at some stage as they have
      // their own live collections, REST APIs, etc.
      categories: this.categoriesForForumStrategy.map(id),
      topics: this.topicsForForumStrategy ? this.topicsForForumStrategy.map(id) : undefined,
      subscribed: this.subscriptionStrategy ? this.subscriptionStrategy.map(forum) : undefined,
      permissions: this.permissionsStrategy ? this.permissionsStrategy.map(forum) : undefined
    };
  },

  name: 'ForumStrategy',
};

function getCurrentUserFromOptions(options) {
  return options && options.currentUser;
}

function getCurrentUserIdFromOptions(options) {
  if (options && options.currentUserId) return options.currentUserId;
  if (options && options.currentUser) {
    return options.currentUser._id || options.currentUser.id;
  }
}

/**
 * Forum WITHOUT nested topics or permissions
 */
ForumStrategy.standard = function(options) {
  var strategy = new ForumStrategy();

  var currentUserId = getCurrentUserIdFromOptions(options);

  if (currentUserId) {
    strategy.subscriptionStrategy = new ForumSubscriptionStrategy({
      currentUserId: currentUserId
    });
  }

  strategy.categoriesForForumStrategy = new CategoriesForForumStrategy();

  return strategy;
};

/**
 * Forum with permissions but no nested topics
 */
ForumStrategy.permissions = function(options) {
  var strategy = ForumStrategy.standard(options);

  var currentUser = getCurrentUserFromOptions(options);
  var currentUserId = getCurrentUserIdFromOptions(options);

  if (currentUser || currentUserId) {
    strategy.permissionsStrategy = new ForumPermissionsStrategy({
      currentUser: currentUser,
      currentUserId: currentUserId
    });
  }

  return strategy;
};

/**
 * Forum WITH nested topics and permissions
 */
ForumStrategy.nested = function(options) {
  var strategy = ForumStrategy.permissions(options);

  var currentUserId = getCurrentUserIdFromOptions(options);

  strategy.topicsForForumStrategy = TopicsForForumStrategy.standard({
    currentUserId: currentUserId,
    topicsFilterSort: options && options.topicsFilterSort
  });

  return strategy;
};

module.exports = ForumStrategy;
module.exports.testOnly = {
  getCurrentUserFromOptions: getCurrentUserFromOptions,
  getCurrentUserIdFromOptions: getCurrentUserIdFromOptions
};
