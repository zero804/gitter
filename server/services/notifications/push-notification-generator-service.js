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
var ObjectID = require('mongodb').ObjectID;
var _ = require('underscore');
var notificationDelayMS = nconf.get("notifications:notificationDelay") * 1000;

exports.queueUserTroupesForFirstNotification = function(userTroupes) {
  jobs.create('push-notifications-s1', {
    title: 'Push Notification #1',
    userTroupes: userTroupes
  }).delay(notificationDelayMS)
    .attempts(5)
    .save();
};


exports.queueUserTroupesForSecondNotification = function(userTroupes) {
  jobs.create('push-notifications-s2', {
    title: 'Push Notification #2',
    userTroupes: userTroupes
  }).delay(notificationDelayMS)
    .attempts(5)
    .save();
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
    var otherUserIds = userIds.filter(function(userId) { return userId == senderUserId; });
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

  function serializeItems(troupeId, items, callback) {
    winston.verbose('serializeItems:', items);

    var itemTypes = Object.keys(items);

    var f = new Fiber();

    var TroupeStrategy = serializer.getStrategy("troupeId");
    var troupeStrategy = new TroupeStrategy();

    serializer.serialize(troupeId, troupeStrategy, f.waitor());

    itemTypes.forEach(function(itemType) {
      var itemIds = items[itemType];

      var Strategy = serializer.getStrategy(itemType + "Id");

      if(Strategy) {
        var strategy = new Strategy({ includeTroupe: false });
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

  function notifyUserOfActivitySince(userId, troupeId, since, callback) {
    unreadItemService.getUnreadItemsForUserTroupeSince(userId, troupeId, since, function(err, unreadItems) {
      winston.verbose('getUnreadItemsForUserTroupeSince:', unreadItems);

      if(err) return callback(err);
      if(!Object.keys(unreadItems).length) return callback();


      serializeItems(troupeId, unreadItems, function(err, troupe, items) {

        if(err) return callback(err);
        var text = notificationMessageGenerator.generateNotificationMessage(troupe, items);

        pushNotificationGateway.sendUserNotification(userId, {
          message: text,
          sound: 'notify.caf',
          link: getTroupeUrl(troupe, userId) + '/chat'
        });
      });

    });
  }

  function getStartTimeForItems(items) {
    if(!items.length) return null;
    var times = items.map(function(item) {
      var id = item.itemId;
      var objectId = new ObjectID(id);
      return objectId.getTimestamp().getTime();
    });

    return _.min(times);
  }

  function sendUserTroupesFirstNotification(userTroupesWithItems, callback) {
    userTroupesWithItems.forEach(function(userTroupe) {
      userTroupe.startTime = getStartTimeForItems(userTroupe.items);
    });

    pushNotificationService.lockUsersTroupesForFirstNotification(userTroupesWithItems, function(err, lockedUserTroupes) {
      if(err) return callback(err);

      if(!lockedUserTroupes.length) return callback();

      var f = new Fiber();

      lockedUserTroupes.forEach(function(userTroupe) {
        notifyUserOfActivitySince(userTroupe.userId, userTroupe.troupeId, userTroupe.startTime, f.waitor());
      });

      f.all().then(function() {
        callback();
      }, function(err) {
        winston.error('Failed to send notifications: ' + err + '. Failing silently.', { exception: err });
      });

    });
  }

  function sendUserTroupesSecondNotification(userTroupesWithItems, callback) {
    pushNotificationService.lockUsersTroupesForSeconrd(userTroupesWithItems, function(err, lockedUserTroupes) {
      if(err) return callback(err);

      if(!lockedUserTroupes.length) return callback();

      var f = new Fiber();

      lockedUserTroupes.forEach(function(userTroupe) {
        notifyUserOfActivitySince(userTroupe.userId, userTroupe.troupeId, userTroupe.startTime, f.waitor());
      });

      f.all().then(function() {
        callback();
      }, function(err) {
        winston.error('Failed to send notifications: ' + err + '. Failing silently.', { exception: err });
      });

    });
  }


  jobs.process('push-notifications-s1', 20, function(job, done) {
    var d = job.data;
    sendUserTroupesFirstNotification(d.userTroupes, done);
  });

  jobs.process('push-notifications-s2', 20, function(job, done) {
    var d = job.data;
    sendUserTroupesSecondNotification(d.userTroupes, done);
  });



};
