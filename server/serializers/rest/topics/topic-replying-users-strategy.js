'use strict';

var replyService = require('gitter-web-topics/lib/reply-service');
var Lazy = require('lazy.js');
var UserIdStrategy = require('../user-id-strategy');
var _ = require('lodash');

function createUniqUserSequence(topicIdToUserIdsHash) {
  return Lazy(topicIdToUserIdsHash)
    .values()
    .flatten()
    .map(String)
    .uniq();
}

function TopicReplyingUsersStrategy(/*options*/) {
  this.results = null;
  this.userIdStrategy = null;
}

TopicReplyingUsersStrategy.prototype = {
  preload: function(topicIds) {
    return replyService.findSampleReplyingUserIdsForTopics(topicIds.toArray())
      .bind(this)
      .then(this.preloadTopicIdToUserIdsHash);
  },

  preloadTopicIdToUserIdsHash: function(topicIdToUserIdsHash) {
    this.results = topicIdToUserIdsHash;
    var distinctUserIds = createUniqUserSequence(topicIdToUserIdsHash);
    var userIdStrategy = this.userIdStrategy = UserIdStrategy.slim();
    return userIdStrategy.preload(distinctUserIds);
  },

  map: function(topicId) {
    var userIds = this.results[topicId];
    if (!userIds || !userIds.length) return [];
    var userIdStrategy = this.userIdStrategy;
    return _.map(userIds, function(userId) {
      return userIdStrategy.map(userId)
    });
  },

  name: 'TopicReplyingUsersStrategy'
};

module.exports = TopicReplyingUsersStrategy;
