"use strict";

var Lazy = require('lazy.js');
var _ = require('lodash');
var topicService = require('gitter-web-topics/lib/topic-service');
var TopicStrategy = require('../topic-strategy');

function TopicsForForumStrategy(options) {
  // TODO: default to default filter & sort options from somewhere?
  this.options = options || {};

  this.topicsByForum = null;
  this.topicStrategy = null;
}

TopicsForForumStrategy.prototype = {
  preload: function(forumIds) {
    return topicService.findByForumIds(forumIds.toArray(), this.options)
      .bind(this)
      .then(function(topics) {
        this.topicsByForum = _.groupBy(topics, 'forumId');

        var topicStrategy = this.topicStrategy = TopicStrategy.standard();
        return topicStrategy.preload(Lazy(topics));
      });
  },

  map: function(forumId) {
    // TODO: should we return some out of band data about the filter&sort?

    var topics = this.topicsByForum[forumId];
    if (!topics || !topics.length) return [];

    var topicStrategy = this.topicStrategy;
    return _.map(topics, function(topic) {
      return topicStrategy.map(topic);
    })
  },

  name: 'TopicsForForumStrategy'
};


module.exports = TopicsForForumStrategy;
