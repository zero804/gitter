/*jslint node: true */
"use strict";

var persistence = require("./persistence-service");
var appEvents = require("../app-events");
var fileService = require("./file-service");
var winston = require("winston");
var userService = require("./user-service");
var notificationService = require("./notification-service");
var conversationService = require("./conversation-service");
var pushNotificationService = require("./push-notification-service");

exports.install = function() {

  var collect = {};
  var collectTimeout = null;

  function collectionFinished() {
    var collected = collect;
    collect = {};
    collectTimeout = null;

    pushNotificationService.filterUsersForPushNotificationEligibility(Object.keys(collected), function(err, userIds) {
      if(err) return winston.error("collectionFinished: filterUsersForPushNotificationEligibility failed", { exception: err });
      if(!userIds.length) return winston.debug("collectionFinished: Nobody eligible to notify");

      var notifications = [];
      var items = {};
      userIds.forEach(function(userId) {
        var notification = collected[userId];

        notifications.push({
          userId: userId,
          itemType: notification.type,
          itemId: notification.id,
          troupeId: notification.troupeId
        });
      });

      pushNotificationService.queueDelayedNotificationsForSend(notifications);
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

  /*
  appEvents.onTroupeChat(function(data) {
    var troupeId = data.troupeId;
    var chatMessage = data.chatMessage;

    notificationService.createTroupeChatNotification({
      troupeId: troupeId,
      fromUserId: chatMessage.fromUser.id,
      fromUserDisplayName: chatMessage.fromUser.displayName,
      text: chatMessage.text
    });
  });
  */

  /* File Events */
  appEvents.onFileEvent(function(data) {

    var troupeId = data.troupeId;
    var fileId = data.fileId;
    var version = data.version;

    fileService.findById(fileId, function(err, file) {
      if(err) return winston.error("notificationService: error loading file", { exception: err });
      if(!file) return winston.error("notificationService: unable to find file", fileId);

      var notificationData = {
        fileName: file.fileName,
        fileId: fileId,
        version: version
      };

      switch(data.event) {
        case 'createVersion':
          if(version > 1) {
            notificationService.createTroupeNotification(troupeId, "file:createVersion", notificationData);
          }
          break;

        case 'createNew':
          notificationService.createTroupeNotification(troupeId, "file:createNew", notificationData);
          break;
      }

    });

  });

  appEvents.onMailEvent(function(data) {
    var event =  data.event;
    var troupeId = data.troupeId;
    var conversationId = data.conversationId;
    var mailIndex = data.mailIndex;

    conversationService.findById(conversationId, function(err, conversation) {
      if(err) return winston.error("notificationService: error loading conversation", { exception: err });
      if(!conversation) return winston.error("notificationService: unable to find conversation", conversationId);
      var email = conversation.emails[mailIndex - 1];

      userService.findById(email.fromUserId, function(err, user) {
        if(err) return winston.error("notificationService: error loading user", { exception: err });
        if(!user) return winston.error("notificationService: unable to find user", email.fromUserId);

        var notificationData = {
          conversationId: conversationId,
          mailIndex: mailIndex,
          subject: email.subject,
          from: user.displayName,
          fromUserId: email.id
        };

        notificationService.createTroupeNotification(troupeId, "mail:" + event, notificationData);
      });

    });
  });

};