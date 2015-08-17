"use strict";

var assert  = require('assert');

describe('push-notification-filter', function() {
  var pushNotificationFilter;

  before(function() {
    pushNotificationFilter = require('..');
  });

  describe('findUsersInRoomAcceptingNotifications', function() {
    it('should not filter users who have received no notifications', function(done) {
      var userId1 = 'TEST_USER1_' + Date.now();
      var troupeId = 'TEST_TROUPE1_' + Date.now();

      return pushNotificationFilter.findUsersInRoomAcceptingNotifications(troupeId, [userId1])
        .then(function(result) {
          assert.deepEqual(result, [userId1]); // Notify
        })
        .nodeify(done);
    });

    it('should filter users who have received notifications', function(done) {
      var userId1 = 'TEST_USER1_' + Date.now();
      var troupeId = 'TEST_TROUPE1_' + Date.now();

      var startTime1 = Date.now();
      var startTime2;

      return pushNotificationFilter.findUsersInRoomAcceptingNotifications(troupeId, [userId1])
        .then(function(result) {
          assert.deepEqual(result, [userId1]); // Notify
        })
        .then(function() {
          return pushNotificationFilter.canLockForNotification(userId1, troupeId, startTime1);
        })
        .then(function(locked) {
          assert.equal(locked, 1);
          return pushNotificationFilter.findUsersInRoomAcceptingNotifications(troupeId, [userId1]);
        })
        .then(function(result) {
          assert.deepEqual(result, []); // Do not notify
          // First notification
          return pushNotificationFilter.canUnlockForNotification(userId1, troupeId, 1);
        })
        .then(function(startTime) {
          assert.strictEqual(startTime1, startTime);
          return pushNotificationFilter.findUsersInRoomAcceptingNotifications(troupeId, [userId1]);
        })
        .then(function(result) {
          assert.deepEqual(result, [userId1]); // Notify
          // Second notification
          startTime2 = Date.now();
          return pushNotificationFilter.canLockForNotification(userId1, troupeId, Date.now());
        })
        .then(function(locked) {
          assert.equal(locked, 2);
          return pushNotificationFilter.findUsersInRoomAcceptingNotifications(troupeId, [userId1]);
        })
        .then(function(result) {
          assert.deepEqual(result, []); // Do not notify
          return pushNotificationFilter.canUnlockForNotification(userId1, troupeId, 2);
        })
        .then(function(startTime) {
          assert.strictEqual(startTime2, startTime);
          return pushNotificationFilter.findUsersInRoomAcceptingNotifications(troupeId, [userId1]);
        })
        .then(function(result) {
          assert.deepEqual(result, [userId1]); 
        })
        .nodeify(done);
    });
  });

  describe('Notification Locking', function() {
    it('should lock user troupe pairs so that users dont get too many notifications', function(done) {
      var userId = 'TEST_USER1_' + Date.now();
      var troupeId = 'TEST_TROUPE1_' + Date.now();
      var startTime = Date.now();

      pushNotificationFilter.canLockForNotification(userId, troupeId, startTime, function(err, locked) {
        if(err) return done(err);
        assert.equal(locked, 1);

        pushNotificationFilter.canLockForNotification(userId, troupeId, startTime, function(err, locked) {
          if(err) return done(err);
          assert.equal(locked, 0);

          pushNotificationFilter.canUnlockForNotification(userId, troupeId, 1, function(err, st) {
            if(err) return done(err);

            assert.equal(st, startTime);

            pushNotificationFilter.canUnlockForNotification(userId, troupeId, 1, function(err, st) {
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

      pushNotificationFilter.resetNotificationsForUserTroupe(userId, troupeId, function(err) {
        if(err) return done(err);

        pushNotificationFilter.canLockForNotification(userId, troupeId, startTime, function(err, locked) {
          if(err) return done(err);
          assert.equal(locked, 1);

          pushNotificationFilter.resetNotificationsForUserTroupe(userId, troupeId, function(err) {
            if(err) return done(err);

            pushNotificationFilter.canLockForNotification(userId, troupeId, startTime, function(err, locked) {
              if(err) return done(err);
              assert.equal(locked, 1);

              pushNotificationFilter.resetNotificationsForUserTroupe(userId, troupeId, function(err) {
                if(err) return done(err);

                pushNotificationFilter.canUnlockForNotification(userId, troupeId, 1, function(err, st) {
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
