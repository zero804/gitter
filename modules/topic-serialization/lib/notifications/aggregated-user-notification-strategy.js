"use strict";

var UserStrategy = require('gitter-web-user-serialization/lib/notifications/user-strategy')
var AggregatedForumStrategy = require('./aggregated-forum-strategy');
var AggregatedTopicStrategy = require('./aggregated-topic-strategy');
var AggregatedReplyStrategy = require('./aggregated-reply-strategy');
var AggregatedCommentStrategy = require('./aggregated-comment-strategy');

function AggregatedUserNotificationStrategy() {
  this.userStrategy = new UserStrategy();
  this.forumStrategy = new AggregatedForumStrategy();
  this.topicStrategy = new AggregatedTopicStrategy();
  this.replyStrategy = new AggregatedReplyStrategy();
  this.commentStrategy = new AggregatedCommentStrategy();
}

AggregatedUserNotificationStrategy.prototype = {
  map: function(item) {
    return {
      forum: this.forumStrategy.map(item.forum),
      topic: this.topicStrategy.map(item.topic, item.topicAuthorUser, item.forum),
      reply: item.reply && this.replyStrategy.map(item.reply, item.replyAuthorUser, item.topic, item.forum),
      comment: item.comment && this.commentStrategy.map(item.comment, item.commentAuthorUser, item.reply, item.topic, item.forum),
    }
  },

  name: 'AggregatedUserNotificationStrategy',
};

module.exports = AggregatedUserNotificationStrategy;
