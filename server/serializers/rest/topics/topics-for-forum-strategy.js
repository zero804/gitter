"use strict";

var Lazy = require('lazy.js');
var _ = require('lodash');
var topicService = require('gitter-web-topics/lib/topic-service');
var TopicStrategy = require('../topic-strategy');

function TopicsForForumStrategy(options) {
  // TODO: default to default filter & sort options from somewhere?
  this.topicsFilterSort = options && options.topicsFilterSort;
  this.limit = (options && options.limit) || -1;

  this.topicsByForum = null;
  this.topicStrategy = null;
}

TopicsForForumStrategy.prototype = {
  preload: function(forumIds) {
    return topicService.findByForumIds(forumIds.toArray().slice(0, this.limit), this.topicsFilterSort)
      .bind(this)
      .then(function(topics) {
        this.topicsByForum = _.groupBy(topics, 'forumId');

        return this.topicStrategy.preload(Lazy(topics));
      });
  },

  map: function(forumId) {
    // TODO: should we return some out of band data about the filter&sort?

    var topics = this.topicsByForum[forumId];
    if (!topics || !topics.length) return [];
    var limitedTopics = topics;
    if(this.limit > 0) {
      limitedTopics = topics.slice(0, this.limit);
    }

    var topicStrategy = this.topicStrategy;
    return _.map(limitedTopics, function(topic) {
      return topicStrategy.map(topic);
    })
  },

  name: 'TopicsForForumStrategy'
};


TopicsForForumStrategy.standard = function(options) {
  var strategy = new TopicsForForumStrategy({
    topicsFilterSort: options && options.topicsFilterSort,
    limit: options && options.limit
  });

  var currentUserId = options && options.currentUserId;

  strategy.topicStrategy = TopicStrategy.standard({
    currentUserId: currentUserId
  });

  return strategy;
}


module.exports = TopicsForForumStrategy;
