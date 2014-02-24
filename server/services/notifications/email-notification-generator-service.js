/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var _                        = require("underscore");
var troupeService            = require("../troupe-service");
var userService              = require("../user-service");
var unreadItemService        = require("../unread-item-service");
var serializer               = require('../../serializers/notification-serializer');
var moment                   = require('moment');
var Q                        = require('q');
var collections              = require('../../utils/collections');
var nconf                    = require('../../utils/config');
var emailNotificationService = require('../email-notification-service');
var userSettingsService      = require('../user-settings-service');
var userTroupeSettingsService = require('../user-troupe-settings-service');
var winston                  = require('../../utils/winston');

function removeTestIds(ids) {

  // Remove any test user ids that start with USER
  return ids.filter(function(id) {
    if(typeof id === 'string') {
      return id.indexOf('USER') !== 0 && id.indexOf('TROUPE') !== 0;
    }
    return true;
  });
}

function sendEmailNotifications(since) {
    if(!since) {
      since = moment().subtract('h', nconf.get("notifications:emailDelayHours")).valueOf();
    }

    return unreadItemService.listTroupeUsersForEmailNotifications(since)
      .then(function(userTroupeUnreadHash) {
        return Q.all(Object.keys(userTroupeUnreadHash).map(function(userId) {
          return unreadItemService.markUserAsEmailNotified(userId);
        }))
        .thenResolve(userTroupeUnreadHash);
      })
      .then(function(userTroupeUnreadHash) {
        /**
         * Filter out all users who've opted out of notification emails
         */
        var userIds = removeTestIds(Object.keys(userTroupeUnreadHash));

        return userSettingsService.getMultiUserSettings(userIds, 'unread_notifications_optout').
          then(function(settings) {
            // Check which users have opted out
            userIds.forEach(function(userId) {
              // If unread_notifications_optout is truish, the
              // user has opted out
              if(settings[userId]) {
                winston.verbose('User ' + userId + ' has opted out of unread_notifications, removing from results');
                delete userTroupeUnreadHash[userId];
              }
            });

            return userTroupeUnreadHash;
          });
      })
      .then(function(userTroupeUnreadHash) {

        /**
         * Now we need to filter out users who've turned off notifications for a specific troupe
         * TODO: HANDLE mentions!!!!!
         */
        var userTroupes = [];
        Object.keys(userTroupeUnreadHash).forEach(function(userId) {
            var troupeIds = Object.keys(userTroupeUnreadHash[userId]);
            troupeIds.forEach(function(troupeId) {
              userTroupes.push({ userId: userId, troupeId: troupeId });
            });
        });

        return userTroupeSettingsService.getMultiUserTroupeSettings(userTroupes, "push")
          .then(function(notificationSettings) {
            Object.keys(userTroupeUnreadHash).forEach(function(userId) {
                var troupeIds = Object.keys(userTroupeUnreadHash[userId]);
                troupeIds.forEach(function(troupeId) {
                  var setting = notificationSettings[userId + ':' + troupeId];
                  if(setting && setting !== 'all') {
                    winston.verbose('User ' + userId + ' has disabled notifications for this troupe');
                    delete userTroupeUnreadHash[userId][troupeId];

                    if(Object.keys(userTroupeUnreadHash[userId]).length === 0) {
                      delete userTroupeUnreadHash[userId];
                    }
                  }
                });
            });

            return userTroupeUnreadHash;
          });
      })
      .then(function(userTroupeUnreadHash) {
        /**
         * Step 1: load the required data
         */
        var userIds = removeTestIds(Object.keys(userTroupeUnreadHash));

        var troupeIds = removeTestIds(_.flatten(Object.keys(userTroupeUnreadHash).map(function(userId) {
          return Object.keys(userTroupeUnreadHash[userId]);
        })));


        return Q.all([
            userIds,
            userService.findByIds(userIds),
            troupeService.findByIds(troupeIds),
            userTroupeUnreadHash
          ]);
      })
      .spread(function(userIds, users, allTroupes, userTroupeUnreadHash) {
        /**
         * Step 2: loop through the users
         */
        var troupeHash = collections.indexById(allTroupes);
        var userHash = collections.indexById(users);

        return Q.all(userIds.map(function(userId) {
            var user = userHash[userId];
            if(!user) return;

            var strategy = new serializer.TroupeStrategy({ recipientUserId: user.id });

            var unreadItemsForTroupe = userTroupeUnreadHash[user.id];
            var troupeIds = Object.keys(unreadItemsForTroupe);
            var troupes = troupeIds
                            .map(function(troupeId) { return troupeHash[troupeId]; })
                            .filter(collections.predicates.notNull);

            return serializer.serializeQ(troupes, strategy)
              .then(function(serializedTroupes) {
                var troupeData = serializedTroupes.map(function(t) {
                    var a = userTroupeUnreadHash[userId];
                    var b = a && a[t.id];
                    var unreadCount = b && b.length;
                    return { troupe: t, unreadCount: unreadCount };
                  });

                return emailNotificationService.sendUnreadItemsNotification(user, troupeData);
              });

          }));
      });
}


module.exports = sendEmailNotifications;
