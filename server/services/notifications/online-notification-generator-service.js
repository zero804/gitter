/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var winston                   = require('../../utils/winston');
var Q                         = require('q');
var handlebars                = require('handlebars');
var userTroupeSettingsService = require('../user-troupe-settings-service');
var userService               = require('../user-service');
var appEvents                 = require('gitter-web-appevents');
var serializer                = require('../../serializers/notification-serializer');
var collections               = require('../../utils/collections');

function compile(map) {
  for(var k in map) {
    if (map.hasOwnProperty(k)) {
      map[k] = handlebars.compile(map[k]);
    }
  }
  return map;
}

/* TODO: externalize and internationalise this! */
var templates = compile({
  "chat": "{{#if troupe.oneToOne}}{{{text}}}{{else}}{{{fromUser.displayName}}}: {{{text}}}{{/if}}"
});

var titleTemplates = compile({
  "chat": "{{#if troupe.oneToOne}}New chat from {{{fromUser.displayName}}}{{else}}New chat on {{{troupe.uri}}}{{/if}}"
});

// TODO: get rid of this...
var linkTemplates = compile({
  "chat": "{{{troupeUrl}}}"
});

var senderStrategies = {
  chat: function (data) {
    if (!data) return;
    return data.fromUser && data.fromUser.id;
  }
};





/*
 * Turn notifications into a {hash[notification.itemType] -> [notifications]};
 */
function hashNotificationsByType(notifications) {
  var uniq = {};
  notifications.forEach(function (notification) {
    var a = uniq[notification.itemType];
    if (!a) {
      a = { };
      uniq[notification.itemType] = a;
    }

    a[notification.itemId] = 1;
  });

  var result = {};

  Object.keys(uniq).forEach(function (key) {
    result[key] = Object.keys(uniq[key]);
  });

  return result;
}


/* Takes a whole lot of notifications for the same type of message, and turns them into messages */
function createNotificationMessage(itemType, itemIds, callback) {
  var template = templates[itemType];
  var linkTemplate = linkTemplates[itemType];
  var titleTemplate = titleTemplates[itemType];

  var senderStrategy = senderStrategies[itemType];

  if (!template) {
    return callback(null, null);
  }

  var Strategy = serializer.getStrategy(itemType + "Id");
  if (Strategy) {
      var strategy = new Strategy({ includeTroupe: true });

    serializer.serialize(itemIds, strategy, function (err, serialized) {
      if (err) return callback(err);

      var messages = serialized.map(function (data) {
        var senderUserId = senderStrategy && senderStrategy(data);

        if (!senderUserId) return;

        // Catch-22, we can't figure out the sender until we've done serialization
        // but we can't calculate the troupeUrl (needed _for_ serialization)
        // until we've got the sender. This is only a problem for one to one troupes
        var url = data.troupe.url;
        if (!url) {
          url = data.troupe.urlUserMap && data.troupe.urlUserMap[senderUserId];
          data.troupe.url = url;
        }

        var name = data.troupe.name;
        if (!name) {
          name = data.troupe.nameUserMap && data.troupe.nameUserMap[senderUserId];
          data.troupe.name = name;
        }

        // TODO: sort this ugly hack out
        // This will fit nicely into the new serializer stuff
        if (data.versions) { data.latestVersion = data.versions[data.versions.length - 1]; }
        data.troupeUrl = url;

        var d = {
          data: data,
          text: template(data),
          // sound: 'notify.caf',
          title: titleTemplate ? titleTemplate(data) : null,
          link: linkTemplate ? linkTemplate(data) : null
        };
        return d;
      });

      messages = messages.filter(function (f) { return !!f; });
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
// callback returns function (err, notificationsWithMessages), with notificationsWithMessages looking like:
// [{ notification / message }]
//
function generateNotificationMessages(notificationsItems, callback) {
  var notificationTypeHash = hashNotificationsByType(notificationsItems);

  var hashKeys = Object.keys(notificationTypeHash);
  var promises = [];
  hashKeys.forEach(function (itemType) {
    var itemIds = notificationTypeHash[itemType];

    var d = Q.defer();
    createNotificationMessage(itemType, itemIds, d.makeNodeResolver());
    promises.push(d.promise);
  });

  Q.all(promises)
    .then(function (concatenatedResults) {
      var resultHash = {};
      hashKeys.forEach(function (itemType, i) {
        var ids = notificationTypeHash[itemType];
        var results = concatenatedResults[i];
        results.forEach(function (result, j) {
          var itemId = ids[j];
          resultHash[itemType + ":" + itemId] = result;
        });
      });

      var results = [];

      notificationsItems.forEach(function (notification) {
        var itemType = notification.itemType;
        var itemId = notification.itemId;

        var message = resultHash[itemType + ":" + itemId];

        if (message) {
          results.push({ notification: notification, message: message });
        }
      });

      callback(null, results);
    })
    .fail(callback);
}

function findMentionOnlyUserIds(notifications, notificationSettings) {
  return notifications.filter(function (n) {

    var ns = notificationSettings[n.userId + ':' + n.troupeId];
    var notificationSetting = ns && ns.push;

    return notificationSetting === 'mention';
  }).map(function (n) { return n.userId; });
}

// Takes an array of notification items, which looks like
// [{ userId / itemType / itemId / troupeId }]
exports.sendOnlineNotifications = function (notifications, callback) {

  userTroupeSettingsService
    .getMultiUserTroupeSettings(notifications, 'notifications')
    .then(function (notificationSettings) {

      var userIdsOnMention = findMentionOnlyUserIds(notifications, notificationSettings);

      return userService
        .findByIds(userIdsOnMention)
        .then(function (mentionUsers) {
          var mentionUsersHash = collections.indexById(mentionUsers);

          winston.verbose("Spooling online notifications", { count: notifications.length });

          generateNotificationMessages(notifications, function (err, notificationsWithMessages) {
            if (err) {
              winston.error("Error while generating notification messages: ", { exception: err });
              return callback(err);
            }

            notificationsWithMessages.forEach(function (notificationsWithMessage) {
              var notification = notificationsWithMessage.notification;
              var message = notificationsWithMessage.message;

              var ns = notificationSettings[notification.userId + ':' + notification.troupeId];
              var notificationSetting = ns && ns.push;
              var chat;

              if (notificationSetting === 'mute') return;
              if (notificationSetting === 'mention') {
                var user = mentionUsersHash[notification.userId];

                var itemType = notification.itemType;

                if (itemType != 'chat') return;
                chat = message.data;

                if (!user || !chat) return;

                if (!chat.mentions || !chat.mentions.length) return;

                var username = user.username;

                var userMentioned = chat.mentions.some(function (mention) {
                  var re = new RegExp(mention.screenName, 'i');

                  return username && username.match(re);
                });

                if (!userMentioned) return;
              }

              var n = {
                userId: notification.userId,
                troupeId: notification.troupeId,
                title: message.title,
                text: message.text,
                link: message.link,
                sound: message.sound,
                chatId: message.data.id
              };

              winston.silly("Online notifications: ", n);
              appEvents.userNotification(n);
            });

            return callback();
          });
        });
    })
    .fail(callback);

};

