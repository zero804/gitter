'use strict';

var RxNode = require('rx-node');
var ForumNotification = require('gitter-web-persistence').ForumNotification;
var mongoReadPrefs = require('gitter-web-persistence-utils/lib/mongo-read-prefs')
var mailerService = require('gitter-web-mailer');
var BackendMuxer = require('gitter-web-backend-muxer');
var moment = require('moment');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');

function resolveEmailAddress(user) {
  var backendMuxer = new BackendMuxer(user);
  return backendMuxer.getEmailAddress();
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

/**
 * This is a first effort, to be replaced with
 * streamNotificationsForEmail in future
 */
function simpleNotificationStream(options) {
  var query = {
    emailSent: null
  };

  if (options && options.userId) {
    query.userId = options.userId;
  }

  return ForumNotification.aggregate([{
      $match: query
    }, {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "user"
      }
    }, {
      $unwind: "$user"
    }, {
      $lookup: {
        from: "forums",
        localField: "forumId",
        foreignField: "_id",
        as: "forum"
      }
    }, {
      $unwind: "$forum"
    }, {
      $lookup: {
        from: "topics",
        localField: "topicId",
        foreignField: "_id",
        as: "topic"
      }
    }, {
      $unwind: {
        path: "$topic",
        preserveNullAndEmptyArrays: true
      }
    }, {
      $lookup: {
        from: "users",
        localField: "topic.userId",
        foreignField: "_id",
        as: "topicAuthorUser"
      }
    }, {
      $unwind: {
        path: "$topicAuthorUser",
        preserveNullAndEmptyArrays: true
      }
    },{
      $lookup: {
        from: "replies",
        localField: "replyId",
        foreignField: "_id",
        as: "reply"
      }
    }, {
      $unwind: {
        path: "$reply",
        preserveNullAndEmptyArrays: true
      }
    }, {
      $lookup: {
        from: "users",
        localField: "reply.userId",
        foreignField: "_id",
        as: "replyAuthorUser"
      }
    }, {
      $unwind: {
        path: "$replyAuthorUser",
        preserveNullAndEmptyArrays: true
      }
    },{
      $lookup: {
        from: "comments",
        localField: "commentId",
        foreignField: "_id",
        as: "comment"
      }
    }, {
      $unwind: {
        path: "$comment",
        preserveNullAndEmptyArrays: true
      }
    }, {
      $lookup: {
        from: "users",
        localField: "comment.userId",
        foreignField: "_id",
        as: "commentAuthorUser"
      }
    }, {
      $unwind: {
        path: "$commentAuthorUser",
        preserveNullAndEmptyArrays: true
      }
    }])
    .read(mongoReadPrefs.secondaryPreferred)
    .cursor({ batchSize: 100 })
    .exec()
    .stream();
}

function generateTopicNotification(emailAddress, notification) {
  var date = moment(mongoUtils.getTimestampFromObjectId(notification._id)).format('Do MMMM YYYY');
  var subject = 'New topic'

  return mailerService.sendEmail({
    templateFile:   'new-topic',
    from:           'Gitter <support@gitter.im>',
    fromName:       'Gitter',
    fromEmail:      'support@gitter.im',
    to:             emailAddress,
    subject:        subject,
    tracking: {
      event: 'new-topic',
      data: { email: emailAddress }
    },
    data: {
      date: date,
      notification: notification
    }
  });
}

function generateReplyNotification(emailAddress, notification) {
  var date = moment(mongoUtils.getTimestampFromObjectId(notification._id)).format('Do MMMM YYYY');
  var subject = 'New reply to topic'

  return mailerService.sendEmail({
    templateFile:   'new-topic-reply',
    from:           'Gitter <support@gitter.im>',
    fromName:       'Gitter',
    fromEmail:      'support@gitter.im',
    to:             emailAddress,
    subject:        subject,
    tracking: {
      event: 'new-topic-reply',
      data: { email: emailAddress }
    },
    data: {
      date: date,
      notification: notification
    }
  });
}

function generateCommentNotification(emailAddress, notification) {
  var date = moment(mongoUtils.getTimestampFromObjectId(notification._id)).format('Do MMMM YYYY');
  var subject = 'New comment to reply'

  return mailerService.sendEmail({
    templateFile:   'new-topic-comment',
    from:           'Gitter <support@gitter.im>',
    fromName:       'Gitter',
    fromEmail:      'support@gitter.im',
    to:             emailAddress,
    subject:        subject,
    tracking: {
      event: 'new-topic-comment',
      data: { email: emailAddress }
    },
    data: {
      date: date,
      notification: notification
    }
  });
}

function generateEmailForNotification(notification) {
  return resolveEmailAddress(notification.user)
    .then(function(emailAddress) {
      if (notification.commentId) {
        return generateCommentNotification(emailAddress, notification);
      }

      if (notification.replyId) {
        return generateReplyNotification(emailAddress, notification);
      }

      return generateTopicNotification(emailAddress, notification);
    })

}

function generateNotifications(options) {
  var observable = RxNode.fromReadableStream(simpleNotificationStream(options));

  return observable
    .flatMap(generateEmailForNotification)
    .count()
    .toPromise()
}

module.exports = {
  generateNotifications: generateNotifications,
  streamNotificationsForEmail: streamNotificationsForEmail
};
