/*jslint node: true */
/*global describe:true, it: true */
"use strict";

var testRequire = require('./test-require');

var pushNotificationService = testRequire('./services/push-notification-service');
var persistenceService = testRequire('./services/persistence-service');

var assert = require("assert");

describe('pushNotificationService', function() {
  describe('#registerDevice()', function() {
    it('should prune unused old devices', function(done) {
      var token = new Buffer('TESTTOKEN');
      pushNotificationService.registerDevice('DEVICE1', 'TEST', token, 'TESTDEVICE', function(err, device) {
        if(err) return done(err);

        // Different device, same token
        pushNotificationService.registerDevice('DEVICE2', 'TEST', token, 'OTHERTESTDEVICE', function(err, device) {
          if(err) return done(err);

          persistenceService.PushNotificationDevice.find({ deviceType: 'TEST', deviceId: 'DEVICE1' }, function(err, devices) {
            if(err) return done(err);

            assert.equal(devices.length, 0);

          });
          done();
        });


      });

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
