'use strict';

var Promise = require('bluebird');
var RxNode = require('rx-node');
var ForumNotification = require('gitter-web-persistence').ForumNotification;
var mongoReadPrefs = require('gitter-web-persistence-utils/lib/mongo-read-prefs')

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

var generateEmailForNotification = Promise.method(function(/*notification*/) {
  return null;
})

function generateNotifications(options) {
  var observable = RxNode.fromReadableStream(streamNotificationsForEmail(options));

  return observable
    .flatMap(generateEmailForNotification)
    .count()
    .toPromise()
}

module.exports = {
  generateNotifications: generateNotifications,
  streamNotificationsForEmail: streamNotificationsForEmail
};
