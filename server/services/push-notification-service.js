/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var PushNotificationDevice = require("./persistence-service").PushNotificationDevice;
var winston = require("winston");
var nconf = require('../utils/config');
var Fiber = require('../utils/fiber');
var crypto = require('crypto');
var _ = require('underscore');
var redis = require("../utils/redis"),
    redisClient = redis.createClient();

var Scripto = require('redis-scripto');
var scriptManager = new Scripto(redisClient);
scriptManager.loadFromDir(__dirname + '/../../redis-lua/notify');

var minimumUserAlertIntervalS = nconf.get("notifications:minimumUserAlertInterval");



function buffersEqual(a,b) {
  if (!Buffer.isBuffer(a)) return undefined;
  if (!Buffer.isBuffer(b)) return undefined;
  if (a.length !== b.length) return false;

  for (var i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
  }

  return true;
}
exports.registerDevice = function(deviceId, deviceType, deviceToken, deviceName, appVersion, appBuild, callback) {
  var tokenHash = crypto.createHash('md5').update(deviceToken).digest('hex');

  PushNotificationDevice.findOneAndUpdate(
    { deviceId: deviceId },
    {
      deviceId: deviceId,
      appleToken: deviceToken,
      tokenHash: tokenHash,
      deviceType: deviceType,
      deviceName: deviceName,
      timestamp: new Date(),
      appVersion: appVersion,
      appBuild: appBuild
    },
    { upsert: true },
    function(err, device) {
      // After we've update the device, look for other devices that have given us the same token
      // these are probably phones that have been reset etc, so we need to prune them
      PushNotificationDevice.find({
        tokenHash: tokenHash,
        deviceType: deviceType
      }, function(err, results) {
        var fiber = new Fiber();

        results.forEach(function(device) {
          // This device? Skip
          if(device.deviceId == deviceId) return;

          // If the hashes are the same, we still need to check that the actual tokens are the same
          if(device.deviceToken && deviceToken) {
            if(!buffersEqual(device.deviceToken, deviceToken)) return;
          }

          winston.verbose('Removing unused device ' + device.deviceId);
          device.remove(fiber.waitor());
        });

        fiber.all().then(function() { callback(null, device); }).fail(callback);
      });

    });
};

exports.registerUser = function(deviceId, userId, callback) {
  PushNotificationDevice.findOneAndUpdate(
    { deviceId: deviceId },
    { deviceId: deviceId, userId: userId, timestamp: new Date() },
    { upsert: true },
    callback);
};

exports.findDevicesForUser = function(userId, callback) {
  PushNotificationDevice.find({ userId: userId }, callback);
};

exports.findUsersWithDevices = function(userIds, callback) {
  userIds = _.uniq(userIds);
  PushNotificationDevice.distinct('userId', { userId: { $in: userIds } }, callback);
};

exports.findDevicesForUsers = function(userIds, callback) {
  userIds = _.uniq(userIds);
  PushNotificationDevice
    .where('userId')['in'](userIds)
    .exec(callback);
};

exports.findUsersTroupesAcceptingNotifications = function(userTroupes, callback) {

  var multi = redisClient.multi();
  userTroupes.forEach(function(userTroupes) {
    var userId = userTroupes.userId;
    var troupeId = userTroupes.troupeId;
    multi.exists("nl:" + userId + ':' + troupeId); // notification 1 sent
    multi.exists("nls:" + userId + ':' + troupeId); // awaiting timeout before sending note2
  });

  multi.exec(function(err, replies) {
    if(err) return callback(err);

    var response = userTroupes.map(function(userTroupe, i) {
      var globalLock = replies[i * 2];
      var segmentLock = replies[i * 2 + 1];

      return {
        userId: userTroupe.userId,
        troupeId: userTroupe.troupeId,
        accepting: !globalLock || !segmentLock // Either the user doesn't have a global notification lock or a segment notification lock
      };
    });

    callback(null, response);
  });
};

exports.resetNotificationsForUserTroupe = function(userId, troupeId, callback) {
  redisClient.del("nl:" + userId + ':' + troupeId, "nls:" + userId + ':' + troupeId, callback);
};


// Returns callback(err, notificationNumber)
exports.canLockForNotification = function(userId, troupeId, startTime, callback) {
  var keys = ['nl:' + userId + ':' + troupeId, 'nls:' + userId + ':' + troupeId ];
  var values = [startTime, minimumUserAlertIntervalS];

  scriptManager.run('notify-lock-user-troupe', keys, values, function(err, result) {
    if(err) return callback(err);

    return callback(null, result);
  });
};

// Returns callback(err, falsey value or { startTime: Y }])
exports.canUnlockForNotification = function (userId, troupeId, notificationNumber, callback) {
  var keys = ['nl:' + userId + ':' + troupeId, 'nls:' + userId + ':' + troupeId ];
  var values = [notificationNumber];

  scriptManager.run('notify-unlock-user-troupe', keys, values, function(err, result) {
    if(err) return callback(err);

    return callback(null, result ? parseInt(result, 10) : 0);
  });
};

