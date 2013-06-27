#!/usr/bin/env mocha --ignore-leaks

/*jslint node:true, unused:true*/
/*global describe:true, it:true*/
"use strict";

var testRequire = require('../test-require');
var fixtureLoader = require('../test-fixtures');

var assert = require("assert");
var persistence = testRequire("./services/persistence-service");
var mockito = require('jsmockito').JsMockito;

var times = mockito.Verifiers.times;
var once = times(1);
var twice = times(2);
var thrice = times(3);

var fixture = {};


describe('signup-service', function() {

  describe('#newSignup()', function() {
    it('should create a new user, allow the user to confirm', function(done) {
      var nonExistingEmail = 'testuser' + Date.now() + '@troupetest.local';
      //var troupeName = 'Test Troupe ' + new Date();

      var emailNotificationServiceMock = mockito.spy(testRequire('./services/email-notification-service'));
      var signupService = testRequire.withProxies("./services/signup-service", {
        './email-notification-service': emailNotificationServiceMock
      });

      signupService.newSignupFromLandingPage({
        email: nonExistingEmail
      }, function(err, user) {
        if(err) return done(err);

        assert(user, 'Expected a user');

        mockito.verify(emailNotificationServiceMock, once).sendConfirmationForNewUser();

        persistence.User.findOne({ email: nonExistingEmail }, function(err, user) {
          if(err) return done(err);
          assert(user, 'Expected new user to be created');
          assert(user.confirmationCode, 'Expected a confirmation code for a new user');
          assert(user.status === 'UNCONFIRMED', 'Expected the user to be unconfirmed');

          signupService.confirm(user, function(err, user) {
            assert(user, 'Expected user to be created');
            assert(user.confirmationCode, 'Expected the user to still have a confirmation code');
            assert(user.status === 'PROFILE_NOT_COMPLETED', 'Expected the user to be PROFILE_NOT_COMPLETED');

            mockito.verify(emailNotificationServiceMock, once).sendConfirmationForNewUser();

            done();

          });
        });
      });
    });

    it('should create a new user, and allow a user to resend the confirmation email', function(done) {
      var nonExistingEmail = 'testuser' + Date.now() + '@troupetest.local';
      var troupeName = 'Test Troupe ' + new Date();

      var stub = testRequire('./services/email-notification-service');

      var emailNotificationServiceMock = mockito.spy(stub);
      var signupService = testRequire.withProxies("./services/signup-service", {
        './email-notification-service': emailNotificationServiceMock
      });


      signupService.newSignupFromLandingPage({
        email: nonExistingEmail
      }, function(err, user) {
        if(err) return done(err);

        assert(user, 'Expected a user');

        mockito.verify(emailNotificationServiceMock, once).sendConfirmationForNewUser();

        signupService.resendConfirmation({ email: nonExistingEmail }, function(err, user2) {
          if(err) return done(err);

          assert(user2.id === user.id, "Expected users to match for confirmation");

          mockito.verify(emailNotificationServiceMock, twice).sendConfirmationForNewUser();

          done();
        });
      });
    });

  });

  describe('#newSignupWithAccessRequest()', function() {
    it('should tell an existing user that they need to login to request access', function(done) {

      var emailNotificationServiceMock = mockito.spy(testRequire('./services/email-notification-service'));

      var troupeService = testRequire.withProxies('./services/troupe-service', {
        './email-notification-service': emailNotificationServiceMock
      });

      var signupService = testRequire.withProxies("./services/signup-service", {
        './email-notification-service': emailNotificationServiceMock,
        './troupe-service': troupeService
      });


      persistence.User.findOne({ email: 'testuser@troupetest.local'}, function(err, user) {
        if(err) return done(err);
        if(!user) return done("Could not find user");

        var existingTroupeUri = 'testtroupe1';

        persistence.Troupe.findOne({ uri: existingTroupeUri }, function(err, troupe) {
          if(err) return done(err);
          if(!troupe) return done('Troupe ' + existingTroupeUri + ' not found');

          signupService.newSignupWithAccessRequest({
            email: "testuser@troupetest.local",
            name: "Test Guy",
            troupe: troupe
          }, function(err) {
            if(!err) return done("An error should have been returned");

            mockito.verifyZeroInteractions(emailNotificationServiceMock);

            assert(err.userExists, "The userExists property of the error should be true");
            done();
          });
        });
      });

    });


    it('should allow a new user who has accessed a troupe to signup', function(done) {
      var nonExistingEmail = 'testuser' + Date.now() + '@troupetest.local';
      var existingTroupeUri = 'testtroupe1';

      var emailNotificationServiceMock = mockito.spy(testRequire('./services/email-notification-service'));
      var signupService = testRequire.withProxies("./services/signup-service", {
        './email-notification-service': emailNotificationServiceMock
      });

      var troupeService = testRequire.withProxies('./services/troupe-service', {
        './email-notification-service': emailNotificationServiceMock
      });
      console.log('0');
      persistence.Troupe.findOne({ uri: existingTroupeUri }, function(err, troupe) {
        if(err) return done(err);
        if(!troupe) return done('Troupe ' + existingTroupeUri + ' not found');
      console.log('a');

        signupService.newSignupWithAccessRequest({ email: nonExistingEmail, name: 'Test McTest', troupe: troupe }, function(err, request) {
          if(err) return done(err);
          if(!request) return done('No request created');

          console.log('1');

          mockito.verify(emailNotificationServiceMock, once).sendConfirmationForNewUser();
          console.log('2');

          troupeService.acceptRequest(request, function(err) {
            if(err) return done(err);
          console.log('3');

            persistence.Troupe.findOne({ uri: existingTroupeUri }, function(err, troupe) {
              if(err) return done(err);
              if(!troupe) return done("Unable to find troupe");

              persistence.User.findOne({ email: nonExistingEmail }, function(err, user) {
                if(err) return done(err);

                assert(user, 'User was not found');

                signupService.confirmSignup(user, function(err, user) {
                  if(err) return done(err);

                  assert(user.status == 'PROFILE_NOT_COMPLETED', 'User status is incorrect');

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