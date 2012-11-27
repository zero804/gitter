/*jslint node: true */
"use strict";

var appEvents = require("../app-events");
var winston = require("winston");
var pushNotificationService = require("./push-notification-service");
var nconf = require('../utils/config');
var Q = require("q");
var handlebars = require('handlebars');
var _ = require("underscore");
var unreadItemService = require('./unread-item-service');
var collections = require("../utils/collections");
var kue = require('kue');
var jobs;

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


/*
 * Given a bunch of userIds, filter the list, leaving only those eligible for a
 * push notification. Eligibility requires
 * - A registered mobile device
 * - User has not read anything recently (say 10 seconds)
 * - User has not received a notification in the last X seconds
 */
function filterUsersForPushNotificationEligibility(userIds, callback) {
   var deferDevices = Q.defer();
   var deferUnread = Q.defer();
   var deferAccepting = Q.defer();

  pushNotificationService.findUsersWithDevices(userIds, deferDevices.node());
  pushNotificationService.findUsersAcceptingNotifications(userIds, deferAccepting.node());
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
}

/*
 * Given a bunch of userIds, filter the list, leaving only those eligible for a
 * push notification. Eligibility requires
 * - User has not read anything recently (say 10 seconds)
 * - User has not received a notification in the last X seconds
 */
function filterUsersForPushNotificationEligibilityStageTwo(userIds, callback) {
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

    pushNotificationService.findAndUpdateUsersAcceptingNotifications(userIds, function(err, usersAcceptingNotifications) {
      if(err) return callback(err);

      callback(null, usersAcceptingNotifications);
    });

  });
}

/*
 * Queue a batch of delayed query notifcations.
 * The notifications object has the following shape:
 * [{ userId: '', notificationType: '', itemId: '' }]
 */
function queueDelayedNotificationsForSend(notifications) {
  if(!jobs) {
    jobs = kue.createQueue();
  }

  jobs.create('delayed-notification', {
    title: 'Delayed notification',
    notifications: notifications
  }).delay(notificationDelayMS)
    .attempts(5)
    .save();
}


exports.install = function() {
  var collect = {};
  var collectTimeout = null;

  function collectionFinished() {
    var collected = collect;
    collect = {};
    collectTimeout = null;

    filterUsersForPushNotificationEligibility(Object.keys(collected), function(err, userIds) {
      if(err) return winston.error("collectionFinished: filterUsersForPushNotificationEligibility failed", { exception: err });
      if(!userIds.length) return winston.debug("collectionFinished: Nobody eligible to notify");

      var notifications = [];
      var items = {};
      userIds.forEach(function(userId) {
        var notification = collected[userId];

        notifications.push({
          userId: userId,
          itemType: notification.type,
          itemId: notification.id,
          troupeId: notification.troupeId
        });
      });

      queueDelayedNotificationsForSend(notifications);
    });

  }

  appEvents.onNewUnreadItem(function(data) {
    var troupeId = data.troupeId;
    var userId = data.userId;
    var items = data.items;

    // Don't bother if we've already collected something for this user in this cycle
    if(collect[userId]) return;

    // Pick the item we're going to notify the user about
    var item = null;
    ['chat','file'].forEach(function(itemType) {
      if(!item && items[itemType]) {
        item = {
          troupeId: troupeId,
          type: itemType,
          id: items[itemType][0]
        };
      }
    });

    /* No item worth picking? Quit */
    if(!item) return;

    collect[userId] = item;

    if(!collectTimeout) {
      collectTimeout = setTimeout(collectionFinished, 500);
    }
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

    filterUsersForPushNotificationEligibilityStageTwo(userIds, function(err, usersForPush) {
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

  if(!jobs) {
    jobs = kue.createQueue();
  }

  jobs.process('delayed-notification', 20, function(job, done) {
    winston.info("Incoming job", { data: job.data });
    spoolQueuedNotifications(job.data.notifications, done);
  });

};
