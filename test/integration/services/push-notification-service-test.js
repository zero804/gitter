/*jslint node: true */
/*global describe:true, it: true */
"use strict";

var testRequire = require('../test-require');

var pushNotificationService = testRequire('./services/push-notification-service');
var persistenceService = testRequire('./services/persistence-service');
var mongoUtils = testRequire('./utils/mongo-utils');

var assert = require("assert");

describe('push-notification-service', function() {
  describe('findUsersWithDevices', function() {
    it('should find a user with a registered device', function(done) {
      var userId = mongoUtils.getNewObjectIdString();

      pushNotificationService.testOnly.expireCachedUsersWithDevices();

      return pushNotificationService.registerUser('DEVICE1', userId)
        .then(function() {
          return pushNotificationService.findUsersWithDevices([userId]);
        })
        .then(function(userIds) {
          assert.strictEqual(userIds.length, 1);
          assert.equal(userIds[0], userId);
        })
        .nodeify(done);
    });

    it('should not find user without a registered device', function(done) {
      var userId = mongoUtils.getNewObjectIdString();

      return pushNotificationService.findUsersWithDevices([userId])
        .then(function(userIds) {
          assert.strictEqual(userIds.length, 0);
        })
        .nodeify(done);
    });

  });

  describe('device registration', function() {
    it('should prune unused old devices', function(done) {
      var token = 'TESTTOKEN';

      pushNotificationService.registerDevice('DEVICE1', 'TEST', token, 'TESTDEVICE', '1.0.1', '122')
        .then(function() {
          // Different device, same token
          return pushNotificationService.registerDevice('DEVICE2', 'TEST', token, 'OTHERTESTDEVICE', '1.0.1', '122');
        })
        .then(function() {
          return persistenceService.PushNotificationDevice.findQ({ deviceType: 'TEST', deviceId: 'DEVICE1' });
        })
        .then(function(devices) {
          assert.equal(devices.length, 0);
        })
        .nodeify(done);
    });
  });

  describe('Notification Locking', function() {
    it('should lock user troupe pairs so that users dont get too many notifications', function(done) {
      var userId = 'TEST_USER1_' + Date.now();
      var troupeId = 'TEST_TROUPE1_' + Date.now();
      var startTime = Date.now();

      pushNotificationService.canLockForNotification(userId, troupeId, startTime, function(err, locked) {
        if(err) return done(err);
        assert.equal(locked, 1);

        pushNotificationService.canLockForNotification(userId, troupeId, startTime, function(err, locked) {
          if(err) return done(err);
          assert.equal(locked, 0);

          pushNotificationService.canUnlockForNotification(userId, troupeId, 1, function(err, st) {
            if(err) return done(err);

            assert.equal(st, startTime);

            pushNotificationService.canUnlockForNotification(userId, troupeId, 1, function(err, st) {
              if(err) return done(err);
              assert.equal(st, 0);

              done();

            });
          });
        });
      });
    });

   it('should handle notification resets', function(done) {
      var userId = 'TEST_USER1_' + Date.now();
      var troupeId = 'TEST_TROUPE1_' + Date.now();
      var startTime = Date.now();

      pushNotificationService.resetNotificationsForUserTroupe(userId, troupeId, function(err) {
        if(err) return done(err);

        pushNotificationService.canLockForNotification(userId, troupeId, startTime, function(err, locked) {
          if(err) return done(err);
          assert.equal(locked, 1);

          pushNotificationService.resetNotificationsForUserTroupe(userId, troupeId, function(err) {
            if(err) return done(err);

            pushNotificationService.canLockForNotification(userId, troupeId, startTime, function(err, locked) {
              if(err) return done(err);
              assert.equal(locked, 1);

              pushNotificationService.resetNotificationsForUserTroupe(userId, troupeId, function(err) {
                if(err) return done(err);

                pushNotificationService.canUnlockForNotification(userId, troupeId, 1, function(err, st) {
                  if(err) return done(err);
                  assert.equal(st, 0);

                  done();

                });
              });

            });
          });

        });
      });
    });

  });
});
