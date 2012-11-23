/*jslint node: true */
"use strict";

var persistence = require("./persistence-service");
var appEvents = require("../app-events");
var winston = require("winston");
var c = require("../utils/collections");
var pushNotificationGateway = require("../gateways/push-notification-gateway");
var handlebars = require('handlebars');
var _ = require('underscore');
var troupeService = require("./troupe-service");
var predicates = c.predicates;

function compile(map) {
  for(var k in map) {
    if(map.hasOwnProperty(k)) {
      map[k] = handlebars.compile(map[k]);
    }
  }
  return map;
}

/* TODO: externalize and internationalise this! */
var notificationTemplates = compile({
  "mail:new": "New email with subject \"{{subject}}\" from {{from}}" ,
  "file:createVersion": "Version {{version}}  of {{fileName}} created.",
  "file:createNew": "New file {{fileName}} created.",
  "chat:new": "{{troupeName}}: {{fromUserDisplayName}} chatted: {{message}}"
});

var notificationLinkTemplates = compile({
  "mail:new": "#mail/{{emailId}}",
  "file:createVersion": "#files",
  "file:createNew": "#files",
  "chat:new": "#chat"
});

function findByTroupe(id, options, callback) {
  if(typeof options === 'function') {
    callback = options;
    options = {};
  }

  var q = persistence.Notification
        .where('troupeId', id);

  if(options.skip) q.skip(options.skip);
  if(options.limit) q.limit(options.limit);

  q.sort({ createdDate: 'desc' })
        .slaveOk()
        .exec(callback);
}

function formatNotification(notification) {
  var templateData = {};
  _.extend(templateData, notification.data, { troupeId: notification.troupeId });

  var textTemplate = notificationTemplates[notification.notificationName];
  var linkTemplate = notificationLinkTemplates[notification.notificationName];

  if(!textTemplate || !linkTemplate) { winston.warn("Unknown notification ", notification.notificationName); return null; }

  return {
    id: notification.id,
    troupeId: notification.troupeId,
    createdDate: notification.createdDate,
    notificationText: textTemplate(templateData),
    notificationLink: linkTemplate(templateData)
  };
}

/* Create a new troupe notification */
exports.createTroupeNotification = function(troupeId, notificationName, data) {
  winston.debug("notificationService: createTroupeNotification", arguments);
  var notification = new persistence.Notification({
    troupeId: troupeId,
    userId: null,
    notificationName: notificationName,
    data: data
  });

  notification.save(function(err) {
    if(err) return winston.error("Unable to save notification", err);

    var n = formatNotification(notification);
    if(n) appEvents.newNotification(notification.troupeId, null, n.notificationText, n.notificationLink);
  });
};

/* Find all notifications for a troupe */
exports.findByTroupe = function(id, options, callback) {
  findByTroupe(id, options, function(err, notifications) {
    if(err) return callback(err);
    callback(null, notifications.map(formatNotification).filter(predicates.notNull));
  });
};

exports.createTroupeChatNotification = function(info) {
  var troupeId = info.troupeId;
  var fromUserId = info.fromUserId;
  var fromUserDisplayName = info.fromUserDisplayName;
  var text = info.text;

  winston.info("Creating troupe chat notification ", { troupeId: troupeId, text: text });

  troupeService.findById(troupeId, function(err, troupe) {
    if(err) return winston.error("Unable to find users for troupe ", { troupeId: troupeId });

    var n = formatNotification({
      notificationName: "chat:new",
      data: {
        troupeName: troupe.name,
        fromUserDisplayName: fromUserDisplayName,
        message: text
      }
    });

    winston.info("Sending troupe chat notification ", n);
    var notificationText = n.notificationText;
    if(notificationText.length > 100) {
      notificationText = notificationText.substring(0, 100) + '…';
    }

    pushNotificationGateway.sendUserNotification(troupe.users, notificationText);
  });
};

