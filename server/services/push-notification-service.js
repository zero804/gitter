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

var minimumUserAlertIntervalS = 10; //nconf.get("notifications:minimumUserAlertInterval");

function buffersEqual(a,b) {
  if (!Buffer.isBuffer(a)) return undefined;
  if (!Buffer.isBuffer(b)) return undefined;
  if (a.length !== b.length) return false;

  for (var i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
  }

  return true;
}
exports.registerDevice = function(deviceId, deviceType, deviceToken, deviceName, callback) {
  var tokenHash = crypto.createHash('md5').update(deviceToken).digest('hex');

  PushNotificationDevice.findOneAndUpdate(
    { deviceId: deviceId },
    {
      deviceId: deviceId,
      appleToken: deviceToken,
      tokenHash: tokenHash,
      deviceType: deviceType,
      deviceName: deviceName,
      timestamp: new Date()
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
          // This device? Ski
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
    multi.exists("ns:" + userId + ':' + troupeId + ':1');
    multi.exists("ns:" + userId + ':' + troupeId + ':2');
  });

  multi.exec(function(err, replies) {
    if(err) return callback(err);

    var response = userTroupes.map(function(userTroupe, i) {
      return {
        userId: userTroupe.userId,
        troupeId: userTroupe.troupeId,
        n1s: replies[i * 2],     // notification 1 sent
        n2s: replies[i * 2 + 1]  // notification 2 sent
      };
    });

    callback(null, response);
  });
};

/*
  Attempts to lock user:troupe pairs for first notification. Set the time that that the first unread event
  happened that triggered the notification and sets the lock to expire after minimumUserAlertIntervalS seconds.
  Returns an array of userTroupes that were locked
*/
exports.lockUsersTroupesForFirstNotification = function(userTroupesWithStartTime, callback) {
  var multi = redisClient.multi();
  userTroupesWithStartTime.forEach(function(userTroupe) {
    var userId = userTroupe.userId;
    var troupeId = userTroupe.troupeId;
    var startTime = userTroupe.startTime;
    multi.setnx('ns:' + userId + ':' + troupeId + ':1', startTime);
  });

  multi.exec(function(err, replies) {
    if(err) return callback(err);

    var response = [];
    var m2 = redisClient.multi();
    var count = 0;


    userTroupesWithStartTime.forEach(function(userTroupe, i) {
      var wasSet = !!replies[i];

      if(wasSet) {
        count++;
        response.push(userTroupe);
        m2.expire('ns:' + userTroupe.userId + ':' + userTroupe.troupeId + ':1', minimumUserAlertIntervalS);
      }
    });


    if(count) {
      m2.exec(function(err) {
        if(err) return callback(err);

        callback(null, response);
      });

    } else {
      callback(null, response);

    }

  });
};

exports.lockUsersTroupesForSecondNotification = function(userTroupes, startTime, callback) {

  var multi = redisClient.multi();
  userTroupes.forEach(function(userTroupes) {
    var userId = userTroupes.userId;
    var troupeId = userTroupes.troupeId;
    multi.setnx('ns:' + userId + ':' + troupeId + ':1', 1);
  });

  multi.exec(function(err, replies) {
    if(err) return callback(err);

    var response = {};
    var m2 = redisClient.multi();
    var count = 0;

    userTroupes.forEach(function(userTroupe, i) {
      var wasSet = !!replies[i];
      response[userTroupe.userId] = wasSet;

      if(wasSet) {
        count++;
        m2.expire('ns:' + userTroupe.userId + ':' + userTroupe.troupeId + ':1', minimumUserAlertIntervalS);
      }
    });

    if(count) {
      m2.exec(function(err) {
        if(err) return callback(err);

        callback(null, response);
      });

    } else {
      callback(null, response);

    }

  });
};



exports.findUsersAcceptingNotifications = function(userIds, callback) {
  userIds = _.uniq(userIds);

  var multi = redisClient.multi();
  userIds.forEach(function(userId) {
    multi.exists("nb:" + userId);
  });

  multi.exec(function(err, replies) {
    if(err) return callback(err);

    var response = [];
    replies.forEach(function(reply, index) {
      var userId = userIds[index];
      if(reply === 0) {
        response.push(userId);
      }
    });

    callback(null, response);
  });
};

exports.findAndUpdateUsersAcceptingNotifications = function(userIds, callback) {
  userIds = _.uniq(userIds);

  winston.info("findAndUpdateUsersAcceptingNotifications", { userIds: userIds });

  var multi = redisClient.multi();
  userIds.forEach(function(userId) {
    multi.msetnx("nb:" + userId, "1");
  });

  multi.exec(function(err, replies) {
    if(err) return callback(err);

    var m2 = redisClient.multi();
    var response = [];
    replies.forEach(function(reply, index) {
      var userId = userIds[index];
      if(reply === 1) {
        response.push(userId);
        m2.expire("nb:" + userId, minimumUserAlertIntervalS);
      }
    });

    if(response) {
      m2.exec(function(err/*, replies*/) {
        if(err) return callback(err);

        callback(null, response);
      });
    } else {
      callback(null, response);
    }

  });
};



