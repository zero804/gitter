/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var appEvents = require("../../app-events");

var winston = require("winston");
var Q = require("q");
var handlebars = require('handlebars');
var serializer = require("../../serializers/notification-serializer");

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
  "chat": "{{#if troupe.oneToOne}}{{{text}}}{{else}}{{{fromUser.displayName}}}: {{{text}}}{{/if}}",
  "file": "{{#if troupe.oneToOne}}New file {{{fileName}}} uploaded{{else}}New file {{{fileName}}} uploaded by {{{latestVersion.creatorUser.displayName}}}{{/if}}",
  "request": "{{{user.displayName}}} requested access to join {{{troupe.name}}}"
});

var titleTemplates = compile({
  "chat": "{{#if troupe.oneToOne}}New chat from {{{fromUser.displayName}}}{{else}}New chat on {{{troupe.name}}}{{/if}}",
  "file": "{{#if troupe.oneToOne}}New file from {{{fromUser.displayName}}}{{else}}New file on {{{troupe.name}}}{{/if}}",
  "request": "New request on {{{troupe.name}}}"
});

var linkTemplates = compile({
  "chat": "{{{troupeUrl}}}",
  "file": "{{{troupeUrl}}}#file/{{{id}}}",
  "request": "{{{troupeUrl}}}#request/{{{id}}}"
});

var senderStrategies = {
  "chat": function(data) {
    return data.fromUser.id;
  },
  "file": function(data) {
    return data.latestVersion.creatorUser.id;
  },
  request: null // Never need this for one-to-ones as there are no requests
};





/*
 * Turn notifications into a {hash[notification.itemType] -> [notifications]};
 */
function hashNotificationsByType(notifications) {
  var uniq = {};
  notifications.forEach(function(notification) {
    var a = uniq[notification.itemType];
    if(!a) {
      a = { };
      uniq[notification.itemType] = a;
    }

    a[notification.itemId] = 1;
  });

  var result = {};

  Object.keys(uniq).forEach(function(key) {
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

  if(!template) {
    winston.warn("No template for itemType " + itemType);
    return callback(null, null);
  }

  var Strategy = serializer.getStrategy(itemType + "Id");
  if(Strategy) {
      var strategy = new Strategy({ includeTroupe: true });

      serializer.serialize(itemIds, strategy, function(err, serialized) {
        if(err) return callback(err);
        var senderUserId = null;

        var messages = serialized.map(function(data) {
          if(senderStrategy) {
            senderUserId = senderStrategy(data);
          }

          // Catch-22, we can't figure out the sender until we've done serialization
          // but we can't calculate the troupeUrl (needed _for_ serialization)
          // until we've got the sender. This is only a problem for one to one troupes
          var url = data.troupe.url;
          if(!url) {
            url = data.troupe.urlUserMap && data.troupe.urlUserMap[senderUserId];
            data.troupe.url = url;
          }

          var name = data.troupe.name;
          if(!name) {
            name = data.troupe.nameUserMap && data.troupe.nameUserMap[senderUserId];
            data.troupe.name = name;
          }

          // TODO: sort this ugly hack out
          // This will fit nicely into the new serializer stuff
          if(data.versions) { data.latestVersion = data.versions[data.versions.length - 1]; }
          data.troupeUrl = url;

          var d = {
            text: template(data),
            sound: 'notify.caf',
            title: titleTemplate ? titleTemplate(data) : null,
            link: linkTemplate ? linkTemplate(data) : null
          };
          return d;
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

// Takes an array of notification items, which looks like
// [{ userId / itemType / itemId / troupeId }]
exports.sendOnlineNotifications = function(notifications, callback) {
  winston.verbose("Spooling online notifications", { count: notifications.length });

  generateNotificationMessages(notifications, function(err, notificationsWithMessages) {
    if(err) {
      winston.error("Error while generating notification messages: ", { exception: err });
      return callback(err);
    }

    notificationsWithMessages.forEach(function(notificationsWithMessage) {
      var notification = notificationsWithMessage.notification;
      var message = notificationsWithMessage.message;

      var n = {
        userId: notification.userId,
        troupeId: notification.troupeId,
        title: message.title,
        text: message.text,
        link: message.link,
        sound: message.sound
      };

      winston.silly("Online notifications: ", n);
      appEvents.userNotification(n);
    });

    return callback();

  });

};

