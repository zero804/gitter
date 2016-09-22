'use strict';

var Promise = require('bluebird');
var ForumNotification = require('gitter-web-persistence').ForumNotification;
var _ = require('lodash');
var mongoReadPrefs = require('gitter-web-persistence-utils/lib/mongo-read-prefs')

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


function streamNotificationsForEmail(options) {
  var query = {
    emailSent: null
  };

  if (options && options.userId) {
    query.userId = options.userId;
  }

  return ForumNotification.aggregate([{
      $match: query
    }, {
      $group: {
        _id: {
          userId: "$userId",
          forumId: "$forumId",
          topicId: "$topicId"
        },
        notifications: {
          $push: {
            replyId: "$replyId",
            commentId: "$commentId"
          }
        }
      }
    }, {
      $project: {
        _id: 0,
        userId: "$_id.userId",
        forumId: "$_id.forumId",
        topicId: "$_id.topicId",
        notifications: 1
      }
    }])
    .read(mongoReadPrefs.secondaryPreferred)
    .cursor({ batchSize: 100 })
    .exec()
    .stream();
}


module.exports = {
  createNotifications: Promise.method(createNotifications),
  streamNotificationsForEmail: streamNotificationsForEmail
}
