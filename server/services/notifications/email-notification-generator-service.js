/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var env                       = require('../../utils/env');
var logger                    = env.logger;
var config                    = env.config;
var stats                     = env.stats;

var _                         = require("underscore");
var troupeService             = require("../troupe-service");
var userService               = require("../user-service");
var unreadItemService         = require("../unread-item-service");
var serializer                = require('../../serializers/notification-serializer');
var moment                    = require('moment');
var Q                         = require('q');
var collections               = require('../../utils/collections');
var mongoUtils                = require('../../utils/mongo-utils');
var emailNotificationService  = require('../email-notification-service');
var userSettingsService       = require('../user-settings-service');
var userTroupeSettingsService = require('../user-troupe-settings-service');

var filterTestValues = config.get('notifications:filterTestValues');

var qlimit = require('qlimit');
var limit = qlimit(10);

var timeBeforeNextEmailNotificationS = config.get('notifications:timeBeforeNextEmailNotificationMins') * 60;
var emailNotificationsAfterMins = config.get('notifications:emailNotificationsAfterMins');

function isTestId(id) {
  return id.indexOf('USER') === 0 || id.indexOf('TROUPE') === 0 || !mongoUtils.isLikeObjectId(id);
}

function sendEmailNotifications(since) {
  var start = Date.now();
  if(!since) {
    since = moment().subtract('m', emailNotificationsAfterMins).valueOf();
  }

  return unreadItemService.listTroupeUsersForEmailNotifications(since, timeBeforeNextEmailNotificationS)
    .then(function(userTroupeUnreadHash) {
      if(!filterTestValues) return userTroupeUnreadHash;

      /* Remove testing rubbish */
      Object.keys(userTroupeUnreadHash).forEach(function(userId) {
        if(isTestId(userId)) {
          delete userTroupeUnreadHash[userId];
          return;
        }

        Object.keys(userTroupeUnreadHash[userId]).forEach(function(troupeId) {
          if(isTestId(troupeId)) {
            delete userTroupeUnreadHash[userId][troupeId];
            if(Object.keys(userTroupeUnreadHash[userId]).length === 1) {
              delete userTroupeUnreadHash[userId];
            }
          }
        });
      });

      return userTroupeUnreadHash;
    })
    .then(function(userTroupeUnreadHash) {
      /**
       * Filter out all users who've opted out of notification emails
       */
      var userIds = Object.keys(userTroupeUnreadHash);
      logger.verbose('email-notify: Initial user count: ' + userIds.length);
      if(!userIds.length) return {};

      return userSettingsService.getMultiUserSettings(userIds, 'unread_notifications_optout').
        then(function(settings) {
          // Check which users have opted out
          userIds.forEach(function(userId) {
            // If unread_notifications_optout is truish, the
            // user has opted out
            if(settings[userId]) {
              logger.verbose('User ' + userId + ' has opted out of unread_notifications, removing from results');
              delete userTroupeUnreadHash[userId];
            }
          });

          return userTroupeUnreadHash;
        });
    })
    .then(function(userTroupeUnreadHash) {
      /**
       * Now we need to filter out users who've turned off notifications for a specific troupe
       */
      var userTroupes = [];
      var userIds = Object.keys(userTroupeUnreadHash);

      if(!userIds.length) return {};

      logger.verbose('email-notify: After removing opt-out users: ' + userIds.length);

      userIds.forEach(function(userId) {
          var troupeIds = Object.keys(userTroupeUnreadHash[userId]);
          troupeIds.forEach(function(troupeId) {
            userTroupes.push({ userId: userId, troupeId: troupeId });
          });
      });

      return userTroupeSettingsService.getMultiUserTroupeSettings(userTroupes, "notifications")
        .then(function(notificationSettings) {

          Object.keys(userTroupeUnreadHash).forEach(function(userId) {
              var troupeIds = Object.keys(userTroupeUnreadHash[userId]);
              troupeIds.forEach(function(troupeId) {
                var ns = notificationSettings[userId + ':' + troupeId];
                var setting = ns && ns.push;

                if(setting && setting !== 'all') {
                  logger.verbose('User ' + userId + ' has disabled notifications for this troupe');
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
       *load the data we're going to need for the emails
       */
      var userIds = Object.keys(userTroupeUnreadHash);
      if(!userIds.length) return [userIds, [], [], {}];

      logger.verbose('email-notify: After removing room non-notify users: ' + userIds.length);

      var troupeIds = _.flatten(Object.keys(userTroupeUnreadHash).map(function(userId) {
        return Object.keys(userTroupeUnreadHash[userId]);
      }));

      return Q.all([
          userIds,
          userService.findByIds(userIds),
          troupeService.findByIds(troupeIds),
          userTroupeUnreadHash
        ]);
    })
    .spread(function(userIds, users, allTroupes, userTroupeUnreadHash) {
      if(!userIds.length) return [userIds, [], [], {}];

      /* Remove anyone that we don't have a token for */
      users = users.filter(function(user) {
        return user.hasGitHubScope('user:email');
      });

      userIds = users.map(function(user) { return user.id; });

      logger.verbose('email-notify: After removing users without the correct token: ' + userIds.length);

      return [userIds, users, allTroupes, userTroupeUnreadHash];
    })
    .spread(function(userIds, users, allTroupes, userTroupeUnreadHash) {
      if(!userIds.length) return;

      /**
       * Step 2: loop through the users
       */
      var troupeHash = collections.indexById(allTroupes);
      var userHash = collections.indexById(users);

      var count = 0;

      // Limit the loop to 10 simultaneous sends
      return Q.all(userIds.map(limit(function(userId) {
        var user = userHash[userId];
        if(!user) return;

        var strategy = new serializer.TroupeStrategy({ recipientUserId: user.id });

        var unreadItemsForTroupe = userTroupeUnreadHash[user.id];
        var troupeIds = Object.keys(unreadItemsForTroupe);
        var troupes = troupeIds
                        .map(function(troupeId) { return troupeHash[troupeId]; })
                        .filter(collections.predicates.notNull);

        return serializer.serialize(troupes, strategy)
          .then(function(serializedTroupes) {
            var troupeData = serializedTroupes.map(function(t) {
                var a = userTroupeUnreadHash[userId];
                var b = a && a[t.id];
                var unreadCount = b && b.length;

                if(b) {
                  b.sort();
                }

                return { troupe: t, unreadCount: unreadCount, unreadItems: b };
              }).filter(function(d) {
                return !!d.unreadCount; // This needs to be one or more
              });

            // Somehow we've ended up with no chat messages?
            if(!troupeData.length) return;

            var chatIdsForUser = troupeData.reduce(function(memo, d) {
              return memo.concat(d.unreadItems.slice(-3));
            }, []);

            var chatStrategy = new serializer.ChatIdStrategy({ recipientUserId: user.id });
            return serializer.serializeExcludeNulls(chatIdsForUser, chatStrategy)
              .then(function(chats) {
                var chatsIndexed = collections.indexById(chats);

                troupeData.forEach(function(d) {
                  // Reassemble the chats for the troupe
                  d.chats = d.unreadItems.slice(-3).reduce(function(memo, chatId) {
                    var chat = chatsIndexed[chatId];
                    if(chat) {
                      memo.push(chat);
                    }
                    return memo;
                  }, []);
                });

                count++;
                return emailNotificationService.sendUnreadItemsNotification(user, troupeData)
                  .fail(function(err) {
                    if(err.gitterAction === 'logout_destroy_user_tokens') {
                      stats.event('logout_destroy_user_tokens', { userId: user.id });

                      user.destroyTokens();
                      return user.saveQ();
                    }
                  });

              });
          });

        })))
        .then(function() {
          var time = Date.now() - start;
          logger.info("Sent unread notification emails to " + count + " users in " + time + "ms");
        });
    });
}


module.exports = sendEmailNotifications;
