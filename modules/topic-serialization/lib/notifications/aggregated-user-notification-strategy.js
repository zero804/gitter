"use strict";

var UserStrategy = require('gitter-web-user-serialization/lib/notifications/user-strategy')
var AggregatedTopicStrategy = require('./aggregated-topic-strategy');
var AggregatedReplyStrategy = require('./aggregated-reply-strategy');
var AggregatedCommentStrategy = require('./aggregated-comment-strategy');

function AggregatedUserNotificationStrategy() {
  this.userStrategy = new UserStrategy();
  this.topicStrategy = new AggregatedTopicStrategy();
  this.replyStrategy = new AggregatedReplyStrategy();
  this.commentStrategy = new AggregatedCommentStrategy();
}

AggregatedUserNotificationStrategy.prototype = {
  map: function(item) {
    return {
      forum: item.forum, // TODO: serialize
      topic: this.topicStrategy.map(item.topic, item.topicAuthorUser),
      reply: item.reply && this.replyStrategy.map(item.reply, item.replyAuthorUser),
      comment: item.comment && this.commentStrategy.map(item.comment, item.commentAuthorUser),
    }
  },

  name: 'AggregatedUserNotificationStrategy',
};

module.exports = AggregatedUserNotificationStrategy;
