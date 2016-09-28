"use strict";

var Promise = require('bluebird');
var CategoriesForForumStrategy = require('./topics/categories-for-forum-strategy');
var TopicsForForumStrategy = require('./topics/topics-for-forum-strategy');
var topicService = require('gitter-web-topics/lib/topic-service');
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

    var promises = [];

    // TODO: this will probably be removed in favor of having forum.topicsTotal
    // in the schema. Also: it is not a strategy.
    promises.push(this.loadTopicsTotals(forumIds))
    promises.push(this.categoriesForForumStrategy.preload(forumIds));
    if (this.topicsForForumStrategy) {
      promises.push(this.topicsForForumStrategy.preload(forumIds));
    }
    promises.push(this.subscriptionStrategy.preload(forums));
    promises.push(this.permissionsStrategy.preload(forums));

    return Promise.all(promises);
  },

  // TODO: this will probably be removed in favor of having forum.topicsTotal
  // in the schema. Also: it is not a strategy.
  // @lerouxb to refactor ;-)
  loadTopicsTotals: function(forumIds) {
    return topicService.findTotalsByForumIds(forumIds.toArray())
      .bind(this)
      .then(function(topicsTotals) {
        this.topicsTotalMap = topicsTotals;
      });
  },

  map: function(forum) {
    var id = forum.id || forum._id && forum._id.toHexString();

    var topicsTotal = this.topicsTotalMap[id] || 0;

    return {
      id: id,
      name: forum.name,
      uri: forum.uri,
      tags: forum.tags,
      categories: this.categoriesForForumStrategy.map(id),
      topics: this.topicsForForumStrategy ? this.topicsForForumStrategy.map(id) : undefined,
      subscribed: this.subscriptionStrategy ? this.subscriptionStrategy.map(forum) : undefined,
      topicsTotal: topicsTotal, // TODO: drop this?
      permissions: this.permissionsStrategy.map(forum)
    };
  },

  name: 'ForumStrategy',
};

/**
 * Forum WITHOUT nested topics
 */
ForumStrategy.standard = function(options) {
  var strategy = new ForumStrategy();
  var currentUser;
  var currentUserId;
  if (options) {
    if (options.currentUser) {
      currentUser = options.currentUser;
      currentUserId = currentUser._id;
    }
    if (options.currentUserId) {
      currentUserId = options.currentUserId;
    }
  }

  if (currentUserId) {
    strategy.subscriptionStrategy = new ForumSubscriptionStrategy({
      currentUserId: currentUserId
    });
  }

  strategy.categoriesForForumStrategy = new CategoriesForForumStrategy();


  // TODO: not to be put in the standard strategy...
  strategy.permissionsStrategy = new ForumPermissionsStrategy({
    currentUser: currentUser,
    currentUserId: currentUserId
  });

  return strategy;
}

/**
 * Forum WITH nested topics
 */
ForumStrategy.nested = function(options) {
  var strategy = ForumStrategy.standard(options);
  var currentUserId = options && options.currentUserId;

  strategy.topicsForForumStrategy = TopicsForForumStrategy.standard({
    currentUserId: currentUserId,
    topicsFilterSort: options && options.topicsFilterSort
  });

  return strategy;
}

module.exports = ForumStrategy;
