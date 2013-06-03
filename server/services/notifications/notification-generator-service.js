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
var ObjectID = require('mongodb').ObjectID;

function getStartTimeForItems(items) {
  if(!items.length) return null;
  var times = items.map(function(item) {
    var id = item.itemId;
    var objectId = new ObjectID(id);
    return objectId.getTimestamp().getTime();
  });

  return _.min(times);
}


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

      var mobileSet = {};
      mobileUsers.forEach(function(f) { mobileSet[f] = true; });
      var mobileUserTroupes = offlineUserTroupes.filter(function(ut) { return mobileSet[ut.userId]; });

      pushNotificationService.findUsersTroupesAcceptingNotifications(mobileUserTroupes, function(err, mobileUserTroupes) {
        if(err) return callback(err);

        var pushEligble = [];

        mobileUserTroupes.forEach(function(mut) {
          if(mut.accepting) {
            var userId = mut.userId;
            var troupeId = mut.troupeId;

            var userTroupe = offlineUserTroupeLookup[userId + ':' + troupeId];

            if(userTroupe) {
              var startTime = getStartTimeForItems(userTroupe.items.map(function(i) { return i.itemId; } ).filter(function(f) { return !!f; }));

              pushEligble.push({
                userId: userTroupe.userId,
                troupeId: userTroupe.troupeId,
                startTime: startTime
              });
            }

          }
        });

        done({
          push: pushEligble
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

  notificationCollector.on('collection:push', function(userTroupes) {
    pushNotificationGeneratorService.queueUserTroupesForNotification(userTroupes);
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

  appEvents.localOnly.onEyeballSignal(function(userId, troupeId, eyeballSignal) {
    if(eyeballSignal) {
      pushNotificationService.resetNotificationsForUserTroupe(userId, troupeId, function(err) {
        if(err) winston.error('Error while calling resetNotificationsForUserTroupe. Silently ignoring. ' + err, { exception: err });
      });
    }
  });

};

exports.testOnly = {
  userCategorisationStrategy: userCategorisationStrategy
};
