"use strict";

var Promise = require('bluebird');
var CategoriesForForumStrategy = require('./topics/categories-for-forum-strategy');
var TopicsForForumStrategy = require('./topics/topics-for-forum-strategy');
var topicService = require('gitter-web-topics/lib/topic-service');
var ForumSubscriptionStrategy = require('./topics/forum-subscription-strategy');

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
    promises.push(this.topicsForForumStrategy.preload(forumIds));

    if (this.subscriptionStrategy)

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
      tags: forum.tags,
      categories: this.categoriesForForumStrategy.map(id),
      topics: this.topicsForForumStrategy.map(id),
      subscribed: this.subscriptionStrategy ? this.subscriptionStrategy.map(forum) : undefined,
      topicsTotal: topicsTotal // TODO: drop this?
    };
  },

  name: 'ForumStrategy',
};


ForumStrategy.full = function(options) {
  var strategy = new ForumStrategy();
  strategy.topicsForForumStrategy = new TopicsForForumStrategy(options && options.topics);
  strategy.subscriptionStrategy = new ForumSubscriptionStrategy(options && options.currentUserId);
  strategy.categoriesForForumStrategy = new CategoriesForForumStrategy();

  return strategy;
}

module.exports = ForumStrategy;
