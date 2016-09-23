"use strict";

var Lazy = require('lazy.js');
var _ = require('lodash');
var replyService = require('gitter-web-topics/lib/reply-service');
var ReplyStrategy = require('../reply-strategy');

function RepliesForTopicStrategy() {
  this.repliesByTopic = null;
  this.replyStrategy = null;
}

RepliesForTopicStrategy.prototype = {
  preload: function(topicIds) {
    return replyService.findByTopicIds(topicIds.toArray())
      .bind(this)
      .then(function(replies) {
        this.repliesByTopic = _.groupBy(replies, 'topicId');

        return this.replyStrategy.preload(Lazy(replies));
      });
  },

  map: function(topicId) {
    var replies = this.repliesByTopic[topicId];
    if (!replies || !replies.length) return [];

    var replyStrategy = this.replyStrategy;
    return _.map(replies, function(reply) {
      return replyStrategy.map(reply)
    })
  },

  name: 'RepliesForTopicStrategy'
};

RepliesForTopicStrategy.standard = function(options) {
  var strategy = new RepliesForTopicStrategy();

  strategy.replyStrategy = ReplyStrategy.standard({
    currentUserId: options.currentUserId
  });

  return strategy;
}

module.exports = RepliesForTopicStrategy;
