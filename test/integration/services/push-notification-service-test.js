/*jslint node: true */
/*global describe:true, it: true */
"use strict";

var testRequire = require('../test-require');

var pushNotificationService = testRequire('./services/push-notification-service');
var persistenceService = require('gitter-web-persistence');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');

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
          return persistenceService.PushNotificationDevice.find({ deviceType: 'TEST', deviceId: 'DEVICE1' }).exec();
        })
        .then(function(devices) {
          assert.equal(devices.length, 0);
        })
        .nodeify(done);
    });
  });

});
