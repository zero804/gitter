/*jslint node:true, unused:true*/
/*global describe:true, it:true*/
"use strict";

var testRequire = require('../test-require');

var assert = require("assert");
var persistence = testRequire("./services/persistence-service");
var sinon = require("sinon");

describe('signup-service', function() {

  describe('#newSignup()', function() {

    it('should create a new user and new troupe, allow the user to confirm', function(done) {
      var nonExistingEmail = 'testuser' + Date.now() + '@troupetest.local';
      var troupeName = 'Test Troupe ' + new Date();

      var emailNotificationService = testRequire('./services/email-notification-service');

      var emailNotificationServiceMock = sinon.mock(emailNotificationService);
      var signupService = testRequire.withProxies("./services/signup-service", {
        './services/email-notification-service': emailNotificationService
      });

      emailNotificationServiceMock.expects('sendConfirmationForNewUser').once();

      signupService.newSignup({
        email: nonExistingEmail,
        troupeName: troupeName
      }, function(err, troupeId) {
        if(err) return done(err);

        emailNotificationServiceMock.verify();

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

              emailNotificationServiceMock.verify();

              done();

            });

          });
        });
      });
    });

    it('should create a new user and new troupe, and allow a user to resend the confirmation email', function(done) {
      var nonExistingEmail = 'testuser' + Date.now() + '@troupetest.local';
      var troupeName = 'Test Troupe ' + new Date();

      var emailNotificationService = testRequire('./services/email-notification-service');

      var emailNotificationServiceMock = sinon.mock(emailNotificationService);

      var signupService = testRequire.withProxies("./services/signup-service", {
        './services/email-notification-service': emailNotificationService
      });

      signupService.newSignup({
        email: nonExistingEmail,
        troupeName: troupeName
      }, function(err, troupeId) {
        if(err) return done(err);

        emailNotificationServiceMock.expects('sendConfirmationForNewUser').once();

        signupService.resendConfirmation({ email: nonExistingEmail }, function(err, troupeId2) {
          if(err) return done(err);
          assert(troupeId === troupeId2, 'TroupeID should match');

          emailNotificationServiceMock.verify();

          emailNotificationServiceMock = sinon.mock(emailNotificationService);

          emailNotificationServiceMock.expects('sendConfirmationForNewUser').once();

          signupService.resendConfirmation({ troupeId: troupeId }, function(err, troupeId3) {
            if(err) return done(err);
            assert(troupeId === troupeId3, 'TroupeIDs should match');

            emailNotificationServiceMock.verify();

            done();
          });

        });
      });
    });

    it('should allow an existing ACTIVE user to create a new troupe when not logged in, from the landing page', function(done) {
      var existingEmail = 'testuser' + Date.now() + '@troupetest.local';
      var troupeName = 'Test Troupe ' + new Date();

      var emailNotificationService = testRequire('./services/email-notification-service');
      var signupService = testRequire.withProxies("./services/signup-service", {
        './services/email-notification-service': emailNotificationService
      });

      persistence.User.create({
        email: existingEmail,
        status: 'ACTIVE'
      }, function(err, createdUser) {
          if(err) return done(err);

          var emailNotificationServiceMock = sinon.mock(emailNotificationService);
          emailNotificationServiceMock.expects('sendNewTroupeForExistingUser').once();

          signupService.newSignup({
            email: existingEmail,
            troupeName: troupeName
          }, function(err, troupeId) {
            if(err) return done(err);

            emailNotificationServiceMock.verify();
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

    it('should allow an existing UNCONFIRMED user to create a new troupe when not logged in, from the landing page', function(done) {
      var existingEmail = 'testuser' + Date.now() + '@troupetest.local';
      var troupeName = 'Test Troupe ' + new Date();

      var emailNotificationService = testRequire('./services/email-notification-service');
      var signupService = testRequire.withProxies("./services/signup-service", {
        './services/email-notification-service': emailNotificationService
      });

      persistence.User.create({
        email: existingEmail,
        status: 'UNCONFIRMED'
      }, function(err, createdUser) {
          if(err) return done(err);

          var emailNotificationServiceMock = sinon.mock(emailNotificationService);
          emailNotificationServiceMock.expects('sendNewTroupeForExistingUser').once();

          signupService.newSignup({
            email: existingEmail,
            troupeName: troupeName
          }, function(err, troupeId) {
            if(err) return done(err);

            emailNotificationServiceMock.verify();
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


});