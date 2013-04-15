#!/usr/bin/env mocha --ignore-leaks

/*jslint node:true, unused:true*/
/*global describe:true, it:true*/
"use strict";

var testRequire = require('../test-require');

var assert = require("assert");
var persistence = testRequire("./services/persistence-service");
var mockito = require('jsmockito').JsMockito;

var times = mockito.Verifiers.times;
var once = times(1);
var twice = times(2);
var thrice = times(3);

function testInviteAcceptance(email, userStatus, emailNotificationConfirmationMethod, done) {
  var emailNotificationServiceMock = mockito.spy(testRequire('./services/email-notification-service'));
  var troupeService = testRequire.withProxies("./services/troupe-service", {
    './email-notification-service': emailNotificationServiceMock
  });

  persistence.Troupe.findOne({ uri: 'testtroupe1' }, function(err, troupe) {
    if(err) return done(err);

    persistence.User.create({
      email: email,
      displayName: 'Test User ' + new Date(),
      confirmationCode: null,  // IMPORTANT. This is the point of the test!!!
      status: userStatus }, function(err, user) {
        if(err) return done(err);

        troupeService.addRequest(troupe.id, user.id, function(err, request) {
          if(err) return done(err);

          troupeService.acceptRequest(request, function(err) {
            if(err) return done(err);

            mockito.verify(emailNotificationServiceMock, once)[emailNotificationConfirmationMethod]();

            persistence.Troupe.findOne({ uri: 'testtroupe1' }, function(err, troupe2) {
              if(err) return done(err);

              assert(troupeService.userHasAccessToTroupe(user, troupe2), 'User has not been granted access to the troupe');
              assert(troupeService.userIdHasAccessToTroupe(user.id, troupe2), 'User has not been granted access to the troupe');

              done();
            });

          });
        });

      });
  });
}

describe('troupe-service', function() {

  describe('#acceptRequest()', function() {
    it('should allow an ACTIVE user (without a confirmation code) request to be accepted', function(done) {

      var nonExistingEmail = 'testuser' + Date.now() + '@troupetest.local';

      testInviteAcceptance(nonExistingEmail, 'ACTIVE', 'sendRequestAcceptanceToUser', done);
    });

    it('should allow an UNCONFIRMED user (without a confirmation code) request to be accepted', function(done) {
      var nonExistingEmail = 'testuser' + Date.now() + '@troupetest.local';

      testInviteAcceptance(nonExistingEmail, 'UNCONFIRMED', 'sendConfirmationForNewUserRequest', done);
    });


    it('should allow an PROFILE_NOT_COMPLETED user (without a confirmation code) request to be accepted', function(done) {
      var nonExistingEmail = 'testuser' + Date.now() + '@troupetest.local';

      testInviteAcceptance(nonExistingEmail, 'PROFILE_NOT_COMPLETED', 'sendRequestAcceptanceToUser', done);
    });

  });
});