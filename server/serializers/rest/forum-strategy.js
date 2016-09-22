"use strict";

var Promise = require('bluebird');
var CategoriesForForumStrategy = require('./topics/categories-for-forum-strategy');
var TopicsForForumStrategy = require('./topics/topics-for-forum-strategy');
var topicService = require('gitter-web-topics/lib/topic-service');


function getId(obj) {
  return obj._id || obj.id;
}

function ForumStrategy(options) {
  options = options || {};

  var categoriesForForumStrategy;
  var topicsForForumStrategy;

  var topicsTotalMap;

  function loadTopicsTotals(forumIds) {
    return topicService.findTotalsByForumIds(forumIds)
      .then(function(topicsTotals) {
        topicsTotalMap = topicsTotals;
      });
  }

  this.preload = function(forums) {
    if (forums.isEmpty()) return;

    var forumIds = forums.map(getId);

    var promises = [];

    // TODO: this will probably be removed in favor of having forum.topicsTotal
    // in the schema. Also: it is not a strategy.
    promises.push(loadTopicsTotals(forumIds.toArray()))

    categoriesForForumStrategy = new CategoriesForForumStrategy();
    promises.push(categoriesForForumStrategy.preload(forumIds));

    topicsForForumStrategy = new TopicsForForumStrategy(options.topics);
    promises.push(topicsForForumStrategy.preload(forumIds));

    return Promise.all(promises);

  }

  this.map = function(forum) {
    var id = forum.id || forum._id && forum._id.toHexString();

    var topicsTotal = topicsTotalMap[id] || 0;

    return {
      id: id,
      tags: forum.tags,
      categories: categoriesForForumStrategy.map(id),
      topics: topicsForForumStrategy.map(id),
      topicsTotal: topicsTotal
    };
  }
}

ForumStrategy.prototype = {
  name: 'ForumStrategy',
};

module.exports = ForumStrategy;
