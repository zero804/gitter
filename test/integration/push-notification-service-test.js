/*jslint node: true */
/*global describe:true, it: true */
"use strict";

var pushNotificationService = require('../../server/services/push-notification-service');
var persistenceService = require('../../server/services/persistence-service');

var assert = require("better-assert");

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

            assert(devices.length === 0);

          });
          done();
        });


      });

    });

  });
});
