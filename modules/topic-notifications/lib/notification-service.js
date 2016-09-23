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


/**
 * Only really useful for testing?
 */
function findNotification(forumObject, userId) {
  return ForumNotification.findOne({
      userId: userId,
      forumId: forumObject.forumId,
      topicId: forumObject.topicId,
      replyId: forumObject.replyId,
      commentId: forumObject.commentId
    })
    .lean()
    .exec();
}

function markNotificationAsEmailSent(notificationId) {
  return ForumNotification.update({
      _id: notificationId,
      emailSent: { $eq: null }
    }, {
      $set: {
        emailSent: new Date()
      }
    })
    .exec()
    .then(function(result) {
      return result.nModified > 0;
    })
}

module.exports = {
  createNotifications: Promise.method(createNotifications),
  findNotification: findNotification,
  markNotificationAsEmailSent: Promise.method(markNotificationAsEmailSent)
}
