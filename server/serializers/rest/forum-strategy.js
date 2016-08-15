"use strict";

var Promise = require('bluebird');
var Lazy = require('lazy.js');
var _ = require('lodash');
var forumCategoryService = require('gitter-web-forum-categories/lib/forum-category-service');
var topicService = require('gitter-web-topics/lib/topic-service');
var ForumCategoryStrategy = require('./forum-category-strategy');
var TopicStrategy = require('./topic-strategy');


function getIdString(obj) {
  return obj.id || obj._id && obj._id.toHexString();
}

function ForumStrategy(options) {
  var categoryStrategy;
  var topicStrategy;

  var categoriesMap;
  var topicsMap;
  var topicsTotalMap;

  this.preload = function(forums) {
    if (forums.isEmpty()) return;

    var forumIds = forums.map(getIdString).toArray();

    return Promise.join(
      forumCategoryService.findByForumIds(forumIds),
      // TODO: There should be a way to cherry-pick and sort just some topics
      // rather than ALL the topics in the forum.
      topicService.findByForumIds(forumIds),
      topicService.findTotalsByForumIds(forumIds),
      function(categories, topics, topicsTotals) {
        categoriesMap = _.groupBy(categories, 'forumId');
        topicsMap = _.groupBy(topics, 'forumId');
        topicsTotalMap = topicsTotals;

        var strategies = [];

        categoryStrategy = new ForumCategoryStrategy();
        strategies.push(categoryStrategy.preload(Lazy(categories)));

        // TODO: pass in the categories so TopicStrategy doesn't end up loading
        // the same stuff again. Or maybe serialize as lookups?
        topicStrategy = new TopicStrategy();
        strategies.push(topicStrategy.preload(Lazy(topics)));

        return Promise.all(strategies);
      });
  }

  this.map = function(forum) {
    var id = getIdString(forum);

    var categories = categoriesMap[id] || [];
    var topics = topicsMap[id] || [];
    var topicsTotal = topicsTotalMap[id] || 0;

    return {
      id: id,
      tags: forum.tags,
      categories: categories.map(categoryStrategy.map),
      topics: topics.map(topicStrategy.map),
      topicsTotal: topicsTotal
    };
  }
}

ForumStrategy.prototype = {
  name: 'ForumStrategy',
};

module.exports = ForumStrategy;
