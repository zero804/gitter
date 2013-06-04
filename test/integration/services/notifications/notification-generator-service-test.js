/* jshint node:true */
/*global describe:true, it:true */
"use strict";

var testRequire = require('../../test-require');
var assert = require("assert");

var notificationGeneratorService = testRequire("./services/notifications/notification-generator-service");


describe('notification-generator-service', function() {

  describe('#getStartTimeForItems()', function() {

    it('should do what it says on the tin', function(done) {
      var getStartTimeForItems = notificationGeneratorService.testOnly.getStartTimeForItems;
      assert.equal(getStartTimeForItems(['51add32be11c304c75000005']), 1370346283000);
      done();
    });
  });

});