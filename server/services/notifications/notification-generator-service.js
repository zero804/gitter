/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var appEvents                          = require('gitter-web-appevents');
var winston                            = require('../../utils/winston');
var pushNotificationService            = require("../push-notification-service");
var _                                  = require("lodash");
var presenceService                    = require("gitter-web-presence");
var NotificationCollector              = require('../../utils/notification-collector');
var onlineNotificationGeneratorService = require('./online-notification-generator-service');
var pushNotificationPostbox            = require('./push-notification-postbox');
var mongoUtils                         = require('../../utils/mongo-utils');
var errorReporter                      = require('gitter-web-env').errorReporter;
var uniqueIds                          = require('mongodb-unique-ids');

function getStartTimeForItems(items) {
  if(!items.length) return null;

  var times = items.map(function (id) {
    return mongoUtils.getTimestampFromObjectId(id);
  });

  var result = _.min(times);

  return result;
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

    var offlineUsers = uniqueIds(offlineUserTroupes.map(function(userTroupe) { return userTroupe.userId; } ));

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
  // Listen for onNewUnreadItem events generated locally
  appEvents.onNewOnlineNotification(function(troupeId, chatId, userIds, mentioned) {
    return onlineNotificationGeneratorService.sendOnlineNotifications(troupeId, chatId, userIds, mentioned)
      .catch(function (err) {
        winston.error('Error while generating online notifications: ' + err, { exception: err });
      });
  });

  appEvents.onNewPushNotificationForChat(function(troupeId, chatId, userIds, mentioned) {
    pushNotificationPostbox.queueNotificationsForChat(troupeId, chatId, userIds, mentioned);
    // pushNotificationPostbox.postUserTroupes(userIds.map(function(userId) {
    //   return { troupeId: troupeId, userId: userId, startTime: Date.now() };
    // }));

  });

  console.log('BADGES AND PUSH NOTIFICATIONS AND EYEBALLS ARE CURRENTLY NOT BEING HANDLED');

  return;
  var pushNotificationGateway = require("../../gateways/push-notification-gateway");
  var notificationCollector = new NotificationCollector({ userCategorisationStrategy: userCategorisationStrategy });

  notificationCollector.on('collection:online', function (userTroupes) {
    var notifications = [];

    userTroupes.forEach(function (userTroupe) {
      var userId = userTroupe.userId;
      var troupeId = userTroupe.troupeId;
      var items = userTroupe.items;

      items.forEach(function (item) {
        notifications.push({ itemId: item.itemId, itemType: item.itemType, userId: userId, troupeId: troupeId });
      });

    });

    onlineNotificationGeneratorService.sendOnlineNotifications(notifications, function (err) {
      if(err) winston.error('Error while generating online notifications: ' + err, { exception: err });
    });
  });

  notificationCollector.on('collection:push', function (userTroupes) {
    pushNotificationPostbox.postUserTroupes(userTroupes);
  });


  // Listen for onNewUnreadItem events generated locally
  appEvents.onNewUnreadItem(function(data) {
    var troupeId = '' + data.troupeId;
    var userId = '' + data.userId;
    var items = data.items;

    Object.keys(items).forEach(function(itemType) {
      notificationCollector.incomingNotification(userId, itemType, items[itemType], troupeId);
    });
  });

  // /* Update badges for apps */
  appEvents.onBatchUserBadgeCountUpdate(function(data) {
    var userIds = data.userIds;
    winston.info('Publishing badge count updates for ' + userIds.length + ' users.');
    pushNotificationGateway.sendUsersBadgeUpdates(userIds, function(err) {
      if(err) {
        winston.error('Error while calling sendUsersBadgeUpdates. Silently ignoring. ' + err, { exception: err });
        errorReporter(err, { users: userIds });
      }
    });
  });

  appEvents.onEyeballSignal(function(userId, troupeId, eyeballSignal) {
    if(eyeballSignal) {
      pushNotificationService.resetNotificationsForUserTroupe(userId, troupeId, function(err) {
        if(err) winston.error('Error while calling resetNotificationsForUserTroupe. Silently ignoring. ' + err, { exception: err });
      });
    }
  });

};

exports.testOnly = {
  userCategorisationStrategy: userCategorisationStrategy,
  getStartTimeForItems: getStartTimeForItems
};
