#!/usr/bin/env mocha --ignore-leaks

/*jslint node:true, unused:true*/
/*global describe:true, it:true, before:true, after:true */
"use strict";

var testRequire   = require('../test-require');
var Q             = require('q');
var fixtureLoader = require('../test-fixtures');

var fixture = {};

function FakeMeService() {
  this.getEmail = function() {
    return Q.resolve('mike.bartlett@gmail.com');
  };
}

var emailNotificationService = testRequire.withProxies("./services/email-notification-service", {
  './github/github-me-service': FakeMeService
});

describe('email-notification-service', function() {

  before(fixtureLoader(fixture, {
    user1: { }
  }));

  after(function() {
   fixture.cleanup();
  });

  it('should send emails about unread items', function(done) {
    var USERS_WITH_TROUPES = [{"troupe":{"id":"530b50cdbf2c4e0000000008","name":"~~~TEST~~~ troupe1","uri":"_test_71393250509084","oneToOne":false,"userIds":["530b50cdbf2c4e0000000006","530b50cdbf2c4e0000000007"],"url":"/_test_71393250509084","urlUserMap":false,"nameUserMap":false},"unreadCount":1}];
    emailNotificationService.sendUnreadItemsNotification(fixture.user1, USERS_WITH_TROUPES).nodeify(done);
  });

});
