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

describe('signup-service', function() {

  describe('#newSignup()', function() {
    it('should create a new user and new troupe, allow the user to confirm', function(done) {
      var nonExistingEmail = 'testuser' + Date.now() + '@troupetest.local';
      var troupeName = 'Test Troupe ' + new Date();

      var emailNotificationServiceMock = mockito.spy(testRequire('./services/email-notification-service'));
      var signupService = testRequire.withProxies("./services/signup-service", {
        './email-notification-service': emailNotificationServiceMock
      });

      signupService.newSignup({
        email: nonExistingEmail,
        troupeName: troupeName
      }, function(err, troupeId) {
        if(err) return done(err);
        mockito.verify(emailNotificationServiceMock, once).sendConfirmationForNewUser();

        persistence.User.findOne({ email: nonExistingEmail }, function(err, user) {
          if(err) return done(err);
          assert(user, 'Expected new user to be created');
          assert(user.confirmationCode, 'Expected a confirmation code for a new user');
          assert(user.status === 'UNCONFIRMED', 'Expected the user to be unconfirmed');

          persistence.Troupe.findById(troupeId, function(err, troupe) {
            if(err) return done(err);

            assert(troupe, 'Expected a new troupe to have been created');
            assert(troupe.users.length == 1, 'Expected the new troupe to have a single user');
            assert(troupe.users[0].userId == user.id, 'Expected the new troupe to have a reference to the new user');

            signupService.confirm(user, function(err, user, troupe) {
              assert(user, 'Expected user to be created');
              assert(user.confirmationCode, 'Expected the user to still have a confirmation code');
              assert(user.status === 'PROFILE_NOT_COMPLETED', 'Expected the user to be PROFILE_NOT_COMPLETED');

              assert(troupe, 'Expected a troupe');

              mockito.verify(emailNotificationServiceMock, once).sendConfirmationForNewUser();

              done();

            });

          });
        });
      });
    });

    it('should create a new user and new troupe, and allow a user to resend the confirmation email', function(done) {
      var nonExistingEmail = 'testuser' + Date.now() + '@troupetest.local';
      var troupeName = 'Test Troupe ' + new Date();

      var stub = testRequire('./services/email-notification-service');

      var emailNotificationServiceMock = mockito.spy(stub);
      var signupService = testRequire.withProxies("./services/signup-service", {
        './email-notification-service': emailNotificationServiceMock
      });


      signupService.newSignup({
        email: nonExistingEmail,
        troupeName: troupeName
      }, function(err, troupeId) {
        if(err) return done(err);

        mockito.verify(emailNotificationServiceMock, once).sendConfirmationForNewUser();

        signupService.resendConfirmation({ email: nonExistingEmail }, function(err, troupeId2) {
          if(err) return done(err);

          assert(troupeId === troupeId2, 'TroupeID should match');

          mockito.verify(emailNotificationServiceMock, twice).sendConfirmationForNewUser();

          signupService.resendConfirmation({ troupeId: troupeId }, function(err, troupeId3) {
            if(err) return done(err);
            assert(troupeId === troupeId3, 'TroupeIDs should match');

            mockito.verify(emailNotificationServiceMock, thrice).sendConfirmationForNewUser();

            done();
          });

        });
      });
    });

    it('should allow an existing ACTIVE user to create a new troupe when not logged in, from the landing page', function(done) {
      var existingEmail = 'testuser' + Date.now() + '@troupetest.local';
      var troupeName = 'Test Troupe ' + new Date();

      var emailNotificationServiceMock = mockito.spy(testRequire('./services/email-notification-service'));
      var signupService = testRequire.withProxies("./services/signup-service", {
        './email-notification-service': emailNotificationServiceMock
      });

      persistence.User.create({
        email: existingEmail,
        status: 'ACTIVE'
      }, function(err, createdUser) {
          if(err) return done(err);

          signupService.newSignup({
            email: existingEmail,
            troupeName: troupeName
          }, function(err, troupeId) {
            if(err) return done(err);

            mockito.verify(emailNotificationServiceMock, once).sendNewTroupeForExistingUser();
            assert(troupeId, 'No troupeId returned');

            persistence.Troupe.findById(troupeId, function(err, troupe) {
              if(err) return done(err);

              assert(troupe, 'Troupe not found');
              assert(troupe.users.length == 1, 'Expected the new troupe to have a single user');
              assert(troupe.users[0].userId == createdUser.id, 'Expected the new troupe to have a reference to the existing user');

              done();
            });

          });
        });

      });

    it('should allow an existing ACTIVE user to create a new troupe when not logged in, from the landing page, then attempt to resend the confirmation email', function(done) {
      var existingEmail = 'testuser' + Date.now() + '@troupetest.local';
      var troupeName = 'Test Troupe ' + new Date();

      var emailNotificationServiceMock = mockito.spy(testRequire('./services/email-notification-service'));
      var signupService = testRequire.withProxies("./services/signup-service", {
        './email-notification-service': emailNotificationServiceMock
      });


      persistence.User.create({
        email: existingEmail,
        status: 'ACTIVE'
      }, function(err) {
          if(err) return done(err);


          signupService.newSignup({
            email: existingEmail,
            troupeName: troupeName
          }, function(err, troupeId) {
            if(err) return done(err);

            mockito.verify(emailNotificationServiceMock, once).sendNewTroupeForExistingUser();
            assert(troupeId, 'No troupeId returned');

            signupService.resendConfirmation({ email: existingEmail }, function(err, troupeId) {
              if(err) return done(err);

              assert(troupeId, 'No troupe was found for the resend confirmation');
              mockito.verify(emailNotificationServiceMock, twice).sendNewTroupeForExistingUser();

              signupService.resendConfirmation({ troupeId: troupeId }, function(err, troupeId2) {
                if(err) return done(err);

                assert(troupeId2, 'Troupe was not found');


                mockito.verify(emailNotificationServiceMock, thrice).sendNewTroupeForExistingUser();

                done();
              });

            });

          });
        });

      });

    it('should allow an existing UNCONFIRMED user to create a new troupe when not logged in, from the landing page', function(done) {
      var existingEmail = 'testuser' + Date.now() + '@troupetest.local';
      var troupeName = 'Test Troupe ' + new Date();

      var emailNotificationServiceMock = mockito.spy(testRequire('./services/email-notification-service'));
      var signupService = testRequire.withProxies("./services/signup-service", {
        './email-notification-service': emailNotificationServiceMock
      });

      persistence.User.create({
        email: existingEmail,
        status: 'UNCONFIRMED'
      }, function(err, createdUser) {
          if(err) return done(err);


          signupService.newSignup({
            email: existingEmail,
            troupeName: troupeName
          }, function(err, troupeId) {
            if(err) return done(err);

            mockito.verify(emailNotificationServiceMock, once).sendNewTroupeForExistingUser();
            assert(troupeId, 'No troupeId returned');

            persistence.Troupe.findById(troupeId, function(err, troupe) {
              if(err) return done(err);

              assert(troupe, 'Troupe not found');
              assert(troupe.users.length == 1, 'Expected the new troupe to have a single user');
              assert(troupe.users[0].userId == createdUser.id, 'Expected the new troupe to have a reference to the existing user');

              done();
            });

          });
        });

      });
  });

  describe('#newSignupWithAccessRequest()', function() {
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

      persistence.Troupe.findOne({ uri: existingTroupeUri }, function(err, troupe) {
        if(err) return done(err);
        if(!troupe) return done('Troupe ' + existingTroupeUri + ' not found');

        signupService.newSignupWithAccessRequest({ email: nonExistingEmail, name: 'Test McTest', troupeId: troupe.id }, function(err, request) {
          if(err) return done(err);
          if(!request) return done('No request created');

          troupeService.acceptRequest(request, function(err) {
            if(err) return done(err);

            mockito.verify(emailNotificationServiceMock, once).sendConfirmationForNewUserRequest();

            persistence.User.findOne({ email: nonExistingEmail }, function(err, user) {
              if(err) return done(err);

              assert(user, 'User was not found');

              signupService.confirm(user, function(err, user, troupe) {
                if(err) return done(err);
                assert(user.status == 'PROFILE_NOT_COMPLETED', 'User status is incorrect');
                var userInTroupe = troupe.users.some(function(troupeUser) { return troupeUser.userId == user.id; });

                assert(userInTroupe, 'User does not appear to be in the troupe');
                done();

              });

            });


          });

        });

      });

    });
  });

});