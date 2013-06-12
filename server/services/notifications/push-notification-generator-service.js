/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var winston = require("winston");
var pushNotificationService = require("../push-notification-service");
var nconf = require('../../utils/config');
var unreadItemService = require('./../unread-item-service');
var kue = require('../../utils/kue');
var jobs = kue.createQueue();
var Fiber = require('../../utils/fiber');
var notificationMessageGenerator = require('../../utils/notification-message-generator');

var notificationWindowPeriods = [nconf.get("notifications:notificationDelay") * 1000, nconf.get("notifications:notificationDelay2") * 1000];

exports.queueUserTroupesForNotification = function(userTroupes) {
  userTroupes.forEach(function(userTroupe) {
    pushNotificationService.canLockForNotification(userTroupe.userId, userTroupe.troupeId, userTroupe.startTime, function(err, notificationNumber) {
      if(err) return winston.error('Error while executing canLockForNotification: ' + err, { exception: err });

      if(!notificationNumber) {
        winston.verbose('User troupe already has notification queued. Skipping');
        return;
      }

      var delay = notificationWindowPeriods[notificationNumber - 1];
      if(!delay) {
        // User had already gotten two notifications, that's enough
        return;
      }

      winston.verbose('Queuing notification ' + notificationNumber + ' to be send to user ' + userTroupe.userId + ' in ' + delay + 'ms');

      jobs.create('generate-push-notifications', {
        title: 'Push Notification #' + notificationNumber,
        userTroupe: userTroupe,
        notificationNumber: notificationNumber
      }).delay(delay)
        .save();

    });

  });
};


exports.startWorkers = function() {
  // NB NB circular reference here! Fix this!
  var pushNotificationGateway = require("../../gateways/push-notification-gateway");
  var serializer = require("../../serializers/notification-serializer");

  function getTroupeUrl(serilizedTroupe, senderUserId) {
    /* The URL for non-oneToOne troupes is the trivial case */
    if(!serilizedTroupe.oneToOne) {
      return "/" + serilizedTroupe.uri;
    }

    if(!senderUserId) return null;
    var userIds = serilizedTroupe.userIds;
    var otherUserIds = userIds.filter(function(userId) { return userId != senderUserId; });
    if(otherUserIds.length > 1) {
      winston.warn("Something has gone wrong. There should be a single user left in the one-to-one troupe!", {
        troupeId: serilizedTroupe.id,
        senderUserId: senderUserId,
        otherUserIds: otherUserIds
      });
    }

    var otherUserId = otherUserIds[0];

    if(otherUserId) return "/one-one/" + otherUserId;

    return null;
  }

  function serializeItems(troupeId, recipientUserId, items, callback) {
    winston.verbose('serializeItems:', items);

    var itemTypes = Object.keys(items);

    var f = new Fiber();

    var TroupeStrategy = serializer.getStrategy("troupeId");
    var troupeStrategy = new TroupeStrategy({ recipientUserId: recipientUserId });

    serializer.serialize(troupeId, troupeStrategy, f.waitor());

    itemTypes.forEach(function(itemType) {
      var itemIds = items[itemType];

      var Strategy = serializer.getStrategy(itemType + "Id");

      if(Strategy) {
        var strategy = new Strategy({ includeTroupe: false, recipientUserId: recipientUserId });
        serializer.serialize(itemIds, strategy, f.waitor());
      }

    });

    f.all().then(function(results) {
      var troupe = results[0];
      var serializedItems = {};

      itemTypes.forEach(function(itemType,i ) {
        serializedItems[itemType] = results[i + 1];
      });

      callback(null, troupe, serializedItems);
    }, callback);
  }

  function notifyUserOfActivitySince(userId, troupeId, since, notificationNumber, callback) {
    unreadItemService.getUnreadItemsForUserTroupeSince(userId, troupeId, since, function(err, unreadItems) {
      if(err) return callback(err);

      if(!Object.keys(unreadItems).length) {
        winston.verbose('User has no unread items since ', { userId: userId, troupeId: troupeId, since: since, notificationNumber: notificationNumber} );
        return callback();
      }

      serializeItems(troupeId, userId, unreadItems, function(err, troupe, items) {
        if(err) return callback(err);

        var f = new Fiber();

        var text = notificationMessageGenerator.generateNotificationMessage(troupe, items);

        pushNotificationGateway.sendUserNotification(userId, {
            message: text,
            sound: notificationNumber == 1 ? 'notify.caf' : 'notify-2.caf',
            link: getTroupeUrl(troupe, userId) + '/chat'
          }, f.waitor());

        f.thenCallback(callback);

      });

    });
  }


  function sendUserTroupeNotification(userTroupe, notificationNumber, callback) {
    pushNotificationService.canUnlockForNotification(userTroupe.userId, userTroupe.troupeId, notificationNumber, function(err, startTime) {
      if(err) return callback(err);

      if(!startTime) {
        winston.verbose('Unable to obtain lock to notify userTroupe. Skipping');
        return;
      }

      notifyUserOfActivitySince(userTroupe.userId, userTroupe.troupeId, startTime, notificationNumber, function(err) {
        if(err) winston.error('Failed to send notifications: ' + err + '. Failing silently.', { exception: err });

        return callback();
      });

    });
  }

  jobs.process('generate-push-notifications', 20, function(job, done) {
    var d = job.data;
    sendUserTroupeNotification(d.userTroupe, d.notificationNumber, kue.wrapCallback(job, done));
  });


};
