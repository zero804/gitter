'use strict';

var Promise = require('bluebird');
var ForumNotification = require('gitter-web-persistence').ForumNotification;
var _ = require('lodash');

function createNotifications(forumObject, userIds) {
  if (!userIds || !userIds.length) return;

  var docs = _.map(userIds, function(userId) {
    return {
      userId: userId,
      forumId: forumObject.forumId,
      topicId: forumObject.topicId,
      replyId: forumObject.replyId,
      commentId: forumObject.commentId,
      emailSent: null
    }
  });

  return ForumNotification.insertMany(docs);
}

module.exports = {
  createNotifications: Promise.method(createNotifications),
}
