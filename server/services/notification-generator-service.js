/*jshint globalstrict:true, trailing:false unused:true node:true*/
"use strict";

var appEvents = require("../app-events");
var winston = require("winston").prefix("notification-gen: ");
var pushNotificationService = require("./push-notification-service");
var nconf = require('../utils/config');
var Q = require("q");
var handlebars = require('handlebars');
var _ = require("underscore");
var unreadItemService = require('./unread-item-service');
var collections = require("../utils/collections");
var kue = require('kue');
var presenceService = require("./presence-service");
var jobs;

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
  "chat": "{{fromUser.displayName}} chatted\n{{text}}",
  "file": "New file {{fileName}} uploaded by {{latestVersion.creatorUser.displayName}}"
});


var titleTemplates = compile({
  "chat": "New chat on {{troupe.name}}",
  "file": "New file on {{troupe.name}}"
});

var linkTemplates = compile({
  "chat": "/{{troupe.uri}}#",
  "file": "/{{troupe.uri}}#file/{id}"
});


function categorizeUsersByOnlineStatus(userIds, callback) {
  presenceService.categorizeUsersByOnlineStatus(userIds, function(err, status) {
    if(err) return callback(err);

    var onlineUsers = [];
    var offlineUsers = [];

    userIds.forEach(function(userId) {
      if(status[userId] === 'online') {
        onlineUsers.push(userId);
      } else {
        offlineUsers.push(userId);
      }
    });

    return callback(null, onlineUsers, offlineUsers);
  });
}

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

  pushNotificationService.findUsersWithDevices(userIds, deferDevices.makeNodeResolver());
  pushNotificationService.findUsersAcceptingNotifications(userIds, deferAccepting.makeNodeResolver());
  unreadItemService.findLastReadTimesForUsers(userIds, deferUnread.makeNodeResolver());

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

exports.install = function() {
  var collect = {};
  var collectTimeout = null;

  function collectionFinished() {
    var collected = collect;
    collect = {};
    collectTimeout = null;

    var allUserIds = Object.keys(collected);
    categorizeUsersByOnlineStatus(allUserIds, function(err, onlineUsers, offlineUsers) {
      if(err) return winston.error("collectionFinished: categorizeUsersByOnlineStatus failed", { exception: err });

      function dequeueNotifications(users) {
        var result = [];

        users.forEach(function(userId) {
          var notification = collected[userId];

          result.push({
            userId: userId,
            itemType: notification.type,
            itemId: notification.id,
            troupeId: notification.troupeId
          });
        });
        return result;
      }
      // If a user is online push the message to them through online channels
      if(onlineUsers.length) {
        var immediateNotifications = dequeueNotifications(onlineUsers);
        queueOnlineNotificationsForSend(immediateNotifications);
      }

      if(offlineUsers.length) {
        filterUsersForPushNotificationEligibility(offlineUsers, function(err, userIds) {
          if(err) return winston.error("collectionFinished: filterUsersForPushNotificationEligibility failed", { exception: err });
          if(!userIds.length) return winston.debug("collectionFinished: Nobody eligible for push notifications");

          var delayedNotifications = dequeueNotifications(userIds);
          queueDelayedNotificationsForSend(delayedNotifications);
        });
      }
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

/*
 * Queue a batch of immediate notifcations.
 * The notifications object has the following shape:
 * [{ userId: '', notificationType: '', itemId: '' }]
 */
function queueOnlineNotificationsForSend(notifications) {
  if(!jobs) {
    jobs = kue.createQueue();
  }

  jobs.create('online-notification', {
    title: 'Online notification',
    notifications: notifications
  }).attempts(5)
    .save();
}

exports.startWorkers = function() {
  // NB NB circular reference here! Fix this!
  var pushNotificationGateway = require("../gateways/push-notification-gateway");
  var serializer = require("../serializers/notification-serializer");

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


  /* Takes a whole lot of notifications for the same type of message, and turns them into messages */
  function createNotificationMessage(itemType, itemIds, callback) {
    var template = templates[itemType];
    var linkTemplate = linkTemplates[itemType];
    var titleTemplate = titleTemplates[itemType];

    if(!template) {
      winston.warn("No template for itemType " + itemType);
      return callback(null, null);
    }

    // TODO: move away from resource heavy rest serializer to
    // a lightweight notification serializer
    var Strategy = serializer.getStrategy(itemType + "Id");
    if(Strategy) {
        var strategy = new Strategy({ includeTroupe: true });

        serializer.serialize(itemIds, strategy, function(err, serialized) {
          if(err) return callback(err);

          var messages = serialized.map(function(data) {
            // TODO: sort this ugly hack out
            // This will fit nicely into the new serializer stuff
            if(data.versions) { data.latestVersion = data.versions[data.versions.length - 1]; }
            winston.debug("Data for serailiz", data);
            return {
              text: template(data),
              title: titleTemplate ? titleTemplate(data) : null,
              sound: "",
              link: linkTemplate ? linkTemplate(data) : null
            };
          });

          callback(null, messages);
        });
    } else {
      winston.warn("No strategy for itemType " + itemType);

      return callback(null, null);
    }
  }

  //
  // Takes an array of notification items, which looks like
  // [{ userId / itemType / itemId / troupeId }]
  // callback returns function(err, notificationsWithMessages), with notificationsWithMessages looking like:
  // [{ notification / message }]
  //
  function generateNotificationMessages(notificationsItems, callback) {
    var notificationTypeHash = hashNotificationsByType(notificationsItems);

    var hashKeys = Object.keys(notificationTypeHash);
    var promises = [];
    hashKeys.forEach(function(itemType) {
      var itemIds = notificationTypeHash[itemType];

      var d = Q.defer();
      createNotificationMessage(itemType, itemIds, d.makeNodeResolver());
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

        winston.info("spoolQueuedNotifications: sending ", { notifications: notificationsItems });
        var results = [];

        notificationsItems.forEach(function(notification) {
          var itemType = notification.itemType;
          var itemId = notification.itemId;

          var message = resultHash[itemType + ":" + itemId];

          if(message) {
            results.push({ notification: notification, message: message });
          }
        });

        callback(null, results);
      })
      .fail(function(err) {
        callback(err);
      });
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

      /* Ignore any notifications for users who've received a notification in the last 10 seconds */
      notifications = notifications.filter(function(notification) { return userIdsHash[notification.userId]; });
      if(!notifications.length) {
        winston.info("spoolQueuedNotifications: everyone has been notified already");
        return callback();
      }

      generateNotificationMessages(notifications, function(err, notificationsWithMessages) {
        if(err) {
          winston.error("Error while generating notification messages: ", { exception: err });
          return callback(err);
        }

        notificationsWithMessages.forEach(function(notificationsWithMessage) {
          var notification = notificationsWithMessage.notification;
          var message = notificationsWithMessage.message;

          pushNotificationGateway.sendUserNotification(notification.userId, message.text);
        });

      });

    });
  }

  function spoolOnlineNotifications(notifications, callback) {
    winston.debug("Spooling online notifications", { count: notifications.length });

    generateNotificationMessages(notifications, function(err, notificationsWithMessages) {
      if(err) {
        winston.error("Error while generating notification messages: ", { exception: err });
        return callback(err);
      }

      notificationsWithMessages.forEach(function(notificationsWithMessage) {
        var notification = notificationsWithMessage.notification;
        var message = notificationsWithMessage.message;

        appEvents.userNotification({
          userId: notification.userId,
          title: message.title,
          text: message.text,
          link: message.link,
          sound: message.sound
        });
      });

    });

  }

  if(!jobs) {
    jobs = kue.createQueue();
  }

  jobs.process('delayed-notification', 20, function(job, done) {
    spoolQueuedNotifications(job.data.notifications, done);
  });


  jobs.process('online-notification', 20, function(job, done) {
    spoolOnlineNotifications(job.data.notifications, done);
  });

};
