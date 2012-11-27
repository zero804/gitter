/*jslint node: true */
"use strict";

var PushNotificationDevice = require("./persistence-service").PushNotificationDevice;
var winston = require("winston");
var unreadItemService = require('./unread-item-service');
var Q = require("q");
var _ = require("underscore");
var collections = require("../utils/collections");
var nconf = require('../utils/config');
var kue = require('kue'),
    jobs = kue.createQueue(),
    redis = require("redis"),
    redisClient = redis.createClient();
var handlebars = require('handlebars');

var minimumUserAlertIntervalS = nconf.get("notifications:minimumUserAlertInterval");
var minimumUserAlertIntervalMS = nconf.get("notifications:minimumUserAlertInterval") * 1000;
var notificationDelayMS = nconf.get("notifications:notificationDelay") * 1000;

function compile(map) {
  for(var k in map) {
    if(map.hasOwnProperty(k)) {
      map[k] = handlebars.compile(map[k]);
    }
  }
  return map;
}

/* TODO: externalize and internationalise this! */
var templates = compile({
  "chat": "{{troupe.name}}\nChat from {{fromUser.displayName}}\n{{text}}",
  "file": "Stuff are happening with a file"
  });

exports.registerAppleDevice = function(deviceId, deviceToken, callback) {
  PushNotificationDevice.findOneAndUpdate(
    { deviceId: deviceId },
    { deviceId: deviceId, appleToken: deviceToken, deviceType: 'APPLE', timestamp: new Date() },
    { upsert: true },
    callback);
};

exports.registerAppleUser = function(deviceId, userId, callback) {
  PushNotificationDevice.findOneAndUpdate(
    { deviceId: deviceId },
    { deviceId: deviceId, userId: userId, deviceType: 'APPLE', timestamp: new Date() },
    { upsert: true },
    callback);
};

exports.findDevicesForUser = function(userId, callback) {
  PushNotificationDevice.find({ userId: userId }, callback);
};

exports.findUsersWithDevices = function(userIds, callback) {
  PushNotificationDevice.distinct('userId', { userId: { $in: userIds } }, callback);
};

exports.findDevicesForUsers = function(userIds, callback) {
  PushNotificationDevice
    .where('userId').in(userIds)
    .exec(callback);
};


exports.findUsersAcceptingNotifications = function(userIds, callback) {
  var multi = redisClient.multi();
  userIds.forEach(function(userId) {
    multi.exists("nb:" + userId);
  });

  multi.exec(function(err, replies) {
    if(err) return callback(err);

    var response = [];
    replies.forEach(function(reply, index) {
      var userId = userIds[index];
      if(reply === 0) {
        response.push(userId);
      }
    });

    callback(null, response);
  });
};

exports.findAndUpdateUsersAcceptingNotifications = function(userIds, callback) {
  winston.info("findAndUpdateUsersAcceptingNotifications", { userIds: userIds });

  var multi = redisClient.multi();
  userIds.forEach(function(userId) {
    multi.msetnx("nb:" + userId, "1");
  });

  multi.exec(function(err, replies) {
    if(err) return callback(err);

    var m2 = redisClient.multi();
    var response = [];
    replies.forEach(function(reply, index) {
      var userId = userIds[index];
      if(reply === 1) {
        response.push(userId);
        m2.expire("nb:" + userId, minimumUserAlertIntervalS);
      }
    });

    if(response) {
      m2.exec(function(err, replies) {
        if(err) return callback(err);

        callback(null, response);
      });
    } else {
      callback(null, response);
    }

  });
};

/*
 * Given a bunch of userIds, filter the list, leaving only those eligible for a
 * push notification. Eligibility requires
 * - A registered mobile device
 * - User has not read anything recently (say 10 seconds)
 * - User has not received a notification in the last X seconds
 */
exports.filterUsersForPushNotificationEligibility = function(userIds, callback) {
   var deferDevices = Q.defer();
   var deferUnread = Q.defer();
   var deferAccepting = Q.defer();

  exports.findUsersWithDevices(userIds, deferDevices.node());
  exports.findUsersAcceptingNotifications(userIds, deferAccepting.node());
  unreadItemService.findLastReadTimesForUsers(userIds, deferUnread.node());

  Q.all([deferDevices.promise, deferAccepting.promise, deferUnread.promise]).spread(function(userIds, userIdsAccepting, lastReadTimes) {
    var filteredUsers = [];
    var now = Date.now();

    var userIdsAcceptingHash = collections.hashArray(userIdsAccepting);

    userIds.forEach(function(userId) {
      var lastReadTime = lastReadTimes[userId];
      var accepting = userIdsAcceptingHash[userId];

      if(accepting) {
        if(!lastReadTime || (now - lastReadTime >= notificationDelayMS * 2)) {
          filteredUsers.push("" + userId);
        }
      }
    });

    callback(null, filteredUsers);
  }).fail(function(err) {
    callback(err);
  });
};


/*
 * Given a bunch of userIds, filter the list, leaving only those eligible for a
 * push notification. Eligibility requires
 * - User has not read anything recently (say 10 seconds)
 * - User has not received a notification in the last X seconds
 */
exports.filterUsersForPushNotificationEligibilityStageTwo = function(userIds, callback) {
   var deferUnread = Q.defer();

  unreadItemService.findLastReadTimesForUsers(userIds, function(err, lastReadTimes) {
    if(err) return callback(err);

    var filteredUsers = [];
    var now = Date.now();

    Object.keys(lastReadTimes).forEach(function(userId) {
      var lastReadTime = lastReadTimes[userId];

      if(!lastReadTime || (now - lastReadTime >= notificationDelayMS * 2)) {
        filteredUsers.push("" + userId);
      }
    });

    // Nobody in the list? then skip the next step
    if(!filteredUsers) return callback(err, filteredUsers);

    exports.findAndUpdateUsersAcceptingNotifications(userIds, function(err, usersAcceptingNotifications) {
      if(err) return callback(err);

      callback(null, usersAcceptingNotifications);
    });

  });

};



exports.startWorkers = function() {
  // NB NB circular reference here! Fix this!
  var pushNotificationGateway = require("../gateways/push-notification-gateway");
  var restSerializer = require("../serializers/rest-serializer");
  var troupeService = require('./troupe-service');

  /*
   * Turn notifications into a {hash[notification.itemType] -> [notifications]};
   */
  function hashNotificationsByType(notifications) {
    var result = {};
    notifications.forEach(function(notification) {
      var a = result[notification.itemType];
      if(!a) {
        a = [];
        result[notification.itemType] = a;
      }
      a.push(notification.itemId);
    });
    return result;
  }



  function spoolQueuedNotifications(notifications, callback) {
    winston.debug("Spooling queued notifications", { queue: notifications });

    var userIds = notifications.map(function(notification) { return notification.userId; });
    userIds = _.uniq(userIds);

    exports.filterUsersForPushNotificationEligibilityStageTwo(userIds, function(err, usersForPush) {
      if(err) return callback(err);
      if(usersForPush.length === 0) {
        winston.info("spoolQueuedNotifications: No users are still eligible for notifications");
        return callback(null);
      }

      winston.info("spoolQueuedNotifications: sending notifications to ", { userIds: usersForPush });
      var userIdsHash = collections.hashArray(usersForPush);

      /* Takes a whole lot of notifications for the same type of message, and turns them into messages */
      function createNotificationMessage(itemType, itemIds, callback) {
        var template = templates[itemType];
        if(!template) return callback(null, null);

        var Strategy = restSerializer.getStrategy(itemType + "Id");
        if(Strategy) {
            var strategy = new Strategy({ includeTroupe: true });

            restSerializer.serialize(itemIds, strategy, function(err, serialized) {
              if(err) return callback(err);

              var messages = serialized.map(function(data, index) { return template(data); });

              callback(null, messages);
            });
        } else {
          return callback(null, null);
        }
      }

      /* Ignore any notifications for users who've received a notification in the last 10 seconds */
      notifications = notifications.filter(function(notification) { return userIdsHash[notification.userId]; });

      var notificationTypeHash = hashNotificationsByType(notifications);

      var hashKeys = Object.keys(notificationTypeHash);
      var promises = [];
      hashKeys.forEach(function(itemType) {
        var itemIds = notificationTypeHash[itemType];

        var d = Q.defer();
        createNotificationMessage(itemType, itemIds, d.node());
        promises.push(d.promise);
      });

      Q.all(promises)
        .then(function(concatenatedResults) {
          var resultHash = {};
          hashKeys.forEach(function(itemType, i) {
            var ids = notificationTypeHash[itemType];
            var results = concatenatedResults[i];
            results.forEach(function(result, j) {
              var itemId = ids[j];
              resultHash[itemType + ":" + itemId] = result;
            });
          });

          winston.info("spoolQueuedNotifications: sending ", { notifications: notifications });

          notifications.forEach(function(notification) {
            var itemType = notification.itemType;
            var itemId = notification.itemId;

            var message = resultHash[itemType + ":" + itemId];

            if(message) {
              pushNotificationGateway.sendUserNotification(notification.userId, message);
            }
          });

          callback();
        })
        .fail(function(err) {
          callback(err);
        });



    });

  }

  jobs.process('delayed-notification', 20, function(job, done) {
    winston.info("Incoming job", { data: job.data });
    spoolQueuedNotifications(job.data.notifications, done);
  });

};

/*
 * Queue a batch of delayed query notifcations.
 * The notifications object has the following shape:
 * [{ userId: '', notificationType: '', itemId: '' }]
 */
exports.queueDelayedNotificationsForSend = function(notifications) {
  winston.info("Queuing job", { data: notifications });

  jobs.create('delayed-notification', {
    title: 'Delayed notification',
    notifications: notifications
  }).delay(notificationDelayMS)
    .attempts(5)
    .save();
};