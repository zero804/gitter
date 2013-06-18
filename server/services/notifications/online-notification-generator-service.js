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
  "chat": "{{{troupe.name}}}\n{{{fromUser.displayName}}}: {{{text}}}",
  "file": "{{{troupe.name}}}\nNew file {{{fileName}}} uploaded by {{{latestVersion.creatorUser.displayName}}}",
  "request": "{{{user.displayName}}} requested access to join {{{troupe.name}}}"
});

var titleTemplates = compile({
  "chat": "New chat on {{{troupe.name}}}",
  "file": "New file on {{{troupe.name}}}",
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

function getTroupeUrl(serilizedTroupe, senderUserId) {
  if(!serilizedTroupe) return null;

  /* The URL for non-oneToOne troupes is the trivial case */
  if(!serilizedTroupe.oneToOne) {
    return "/" + serilizedTroupe.uri;
  }

  if(!senderUserId) {
    winston.warn("Something has gone wrong. A message to a one-to-one troupe, yet we don't know who the sender is");
    return null;
  }

  return "/one-one/" + senderUserId;
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

          // TODO: sort this ugly hack out
          // This will fit nicely into the new serializer stuff
          if(data.versions) { data.latestVersion = data.versions[data.versions.length - 1]; }
          data.troupeUrl = getTroupeUrl(data.troupe, senderUserId);

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

