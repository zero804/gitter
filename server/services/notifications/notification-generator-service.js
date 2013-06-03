/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var appEvents = require("../../app-events");

var winston = require("winston");
var pushNotificationService = require("../push-notification-service");
var _ = require("underscore");
var presenceService = require("./../presence-service");
var NotificationCollector = require('../../utils/notification-collector');
var onlineNotificationGeneratorService = require('./online-notification-generator-service');
var pushNotificationGeneratorService = require('./push-notification-generator-service');

function userCategorisationStrategy(userTroupes, callback) {
  presenceService.categorizeUserTroupesByOnlineStatus(userTroupes, function(err, categories) {
    if(err) return callback(err);

    var onlineUserTroupes = categories.online;
    var offlineUserTroupes = categories.offline;

    function done(additionalCategories) {
      var result = _.extend({ online: onlineUserTroupes }, additionalCategories);
      callback(null, result);
    }

    if(!offlineUserTroupes || !offlineUserTroupes.length) {
      // No further categorization of online users
      return done();
    }

    var offlineUsers = _.uniq(offlineUserTroupes.map(function(userTroupe) { return userTroupe.userId; } ));

    var offlineUserTroupeLookup = {};
    offlineUserTroupes.forEach(function(userTroupe) {
      offlineUserTroupeLookup[userTroupe.userId + ':' + userTroupe.troupeId] = userTroupe;
    });

    pushNotificationService.findUsersWithDevices(offlineUsers, function(err, mobileUsers) {
      if(err) return callback(err);
      if(!mobileUsers || !mobileUsers.length) return done();

      // There are mobile users: we need to categorize them users further
      // using the time they were last notified
      pushNotificationService.findUsersTroupesAcceptingNotifications(offlineUserTroupes, function(err, userTroupeNotificationTimes) {
        if(err) return callback(err);

        var mobileCanNotify = [];
        var mobileFirstNotificationSent = [];

        userTroupeNotificationTimes.forEach(function(userTroupeNotificationTime) {
          var userId = userTroupeNotificationTime.userId;
          var troupeId = userTroupeNotificationTime.troupeId;
          var n1s = userTroupeNotificationTime.n1s;  // notification 1 sent
          var n2timeout = userTroupeNotificationTime.n2timeout;
          var n2s = userTroupeNotificationTime.n2s;  // notification 2 sent

          var userTroupe = offlineUserTroupeLookup[userId + ':' + troupeId];
          if(userTroupe) {
            if(!n1s) {
              mobileCanNotify.push(userTroupe);
            } else if(!n2timeout && !n2s) {
              mobileFirstNotificationSent.push(userTroupe);
            }
          }

        });

        done({
          mobile_can_notify: mobileCanNotify,
          mobile_first_notification_sent: mobileFirstNotificationSent
        });
      });

    });

  });
}


//
// This installs the listeners that will listen to events
//
exports.install = function() {
  var notificationCollector = new NotificationCollector({ userCategorisationStrategy: userCategorisationStrategy });

  notificationCollector.on('collection:online', function(userTroupes) {
    var notifications = [];

    userTroupes.forEach(function(userTroupe) {
      var userId = userTroupe.userId;
      var troupeId = userTroupe.troupeId;
      var items = userTroupe.items;

      items.forEach(function(item) {
        notifications.push({ itemId: item.itemId, itemType: item.itemType, userId: userId, troupeId: troupeId });
      });

    });

    onlineNotificationGeneratorService.sendOnlineNotifications(notifications, function(err) {
      if(err) winston.error('Error while generating online notifications: ' + err, { exception: err });
    });
  });

  notificationCollector.on('collection:mobile_can_notify', function(userTroupes) {
    pushNotificationGeneratorService.queueUserTroupesForFirstNotification(userTroupes);
  });

  notificationCollector.on('collection:mobile_first_notification_sent', function(userTroupes) {
    winston.info('mobile_first_notification_sent notifications: ', userTroupes);
    pushNotificationGeneratorService.queueUserTroupesForSecondNotification(userTroupes);
  });

  // Listen for onNewUnreadItem events generated locally
  appEvents.localOnly.onNewUnreadItem(function(data) {
    var troupeId = '' + data.troupeId;
    var userId = '' + data.userId;
    var items = data.items;

    Object.keys(items).forEach(function(itemType) {
      notificationCollector.incomingNotification(userId, itemType, items[itemType], troupeId);
    });

  });

};

exports.testOnly = {
  userCategorisationStrategy: userCategorisationStrategy
};
