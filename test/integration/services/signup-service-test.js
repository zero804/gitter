#!/usr/bin/env mocha --ignore-leaks

/*jslint node:true, unused:true*/
/*global describe:true, it:true, before:false */
"use strict";

var testRequire = require('../test-require');
var fixtureLoader = require('../test-fixtures');

var assert = require("assert");
var persistence = testRequire("./services/persistence-service");
var mockito = require('jsmockito').JsMockito;

var times = mockito.Verifiers.times;
var never = mockito.Verifiers.never();
var once = times(1);
var twice = times(2);
var thrice = times(3);

var fixture = {};
var fixture2 = {};

describe('signup-service', function() {

  before(fixtureLoader(fixture));
  before(fixtureLoader(fixture2, {
    troupe1: { },
    userUnconfirmed1: { status: 'UNCONFIRMED', confirmationCode:true },
    userConfirmed1: { username: true }
  }));


  describe('#newSignup()', function() {
    it('should create a new user, allow the user to confirm', function(done) {
      var nonExistingEmail = 'testuser' + Date.now() + '@troupetest.local';
      //var troupeName = 'Test Troupe ' + new Date();

      var emailNotificationServiceMock = mockito.spy(testRequire('./services/email-notification-service'));
      var signupService = testRequire.withProxies("./services/signup-service", {
        './email-notification-service': emailNotificationServiceMock
      });

      signupService.newSignupFromLandingPage({
        email: nonExistingEmail.toUpperCase()
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


        signupService.newSignupFromLandingPage({
          email: nonExistingEmail
        }, function(err, sameUser) {
          if(err) return done(err);

          assert(user.id === sameUser.id, 'Expected a user');
          mockito.verify(emailNotificationServiceMock, twice).sendConfirmationForNewUser();

          signupService.resendConfirmation({ email: nonExistingEmail }, function(err, user2) {
            if(err) return done(err);

            assert(user2.id === user.id, "Expected users to match for confirmation");

            mockito.verify(emailNotificationServiceMock, thrice).sendConfirmationForNewUser();

            done();
          });
        });
      });
    });

  });

  describe('#signupWithAccessRequestToUri', function() {

    it('should throw an error if an existing CONFIRMED user attempts to signup', function(done) {
      fixtureLoader.use({
        'user1': {},
        'troupe1': { }
      })
      .then(function(fixture) {

        var emailNotificationServiceMock = mockito.spy(testRequire('./services/email-notification-service'));

        var troupeService = mockito.spy(testRequire.withProxies('./services/troupe-service', {
          './email-notification-service': emailNotificationServiceMock
        }));

        var userService = mockito.spy(testRequire('./services/user-service'));

        var signupService = testRequire.withProxies("./services/signup-service", {
          './email-notification-service': emailNotificationServiceMock,
          './troupe-service': troupeService,
          './user-service': userService
        });

        var uri = fixture.troupe1.uri;
        var email = fixture.user1.email;
        var displayName = fixture.user1.displayName;

        return signupService.signupWithAccessRequestToUri(uri, email.toUpperCase(), displayName)
          .then(function() {
            assert(false, 'Expected an exception');
          })
          .fail(function(err) {
            assert(err.userExists, 'Expected err.userExists, got ' + JSON.stringify(err));
          })
          .fin(function() {
            fixture.cleanup();
          });
      })
      .nodeify(done);

    });

    it('should allow an existing UNCONFIRMED user to request access to a troupe', function(done) {

      var emailNotificationServiceMock = mockito.spy(testRequire('./services/email-notification-service'));

      var troupeService = mockito.spy(testRequire.withProxies('./services/troupe-service', {
        './email-notification-service': emailNotificationServiceMock
      }));

      var userService = mockito.spy(testRequire('./services/user-service'));

      var signupService = testRequire.withProxies("./services/signup-service", {
        './email-notification-service': emailNotificationServiceMock,
        './troupe-service': troupeService,
        './user-service': userService
      });

      var uri = fixture2.troupe1.uri;
      var email = fixture2.userUnconfirmed1.email;
      var displayName = fixture2.userUnconfirmed1.displayName;

      signupService.signupWithAccessRequestToUri(uri, email, displayName)
        .then(function() {

          mockito.verify(userService, never).findOrCreateUserForEmail();
          mockito.verify(emailNotificationServiceMock, once).sendConfirmationForNewUser();
          mockito.verify(troupeService, once).addRequest();

        })

        .nodeify(done);

    });

    it('should allow an existing UNCONFIRMED user to invite connection to a user and resend their confirmation email', function(done) {
      var emailNotificationServiceMock = mockito.spy(testRequire('./services/email-notification-service'));

      var troupeService = mockito.spy(testRequire.withProxies('./services/troupe-service', {
        './email-notification-service': emailNotificationServiceMock
      }));

      var userService = mockito.spy(testRequire('./services/user-service'));

      var signupService = testRequire.withProxies("./services/signup-service", {
        './email-notification-service': emailNotificationServiceMock,
        './troupe-service': troupeService,
        './user-service': userService
      });

      var email = fixture.generateEmail();
      var displayName = fixture.generateName();

      persistence.User.createQ({
        email: email,
        displayName: displayName,
        confirmationCode: email,
        status: 'UNCONFIRMED'
      }).then(function(user) {
        var uri = user.getHomeUrl();

        signupService.signupWithAccessRequestToUri(uri, email, displayName)
          .then(function() {

            mockito.verify(userService, never).findOrCreateUserForEmail();
            mockito.verify(emailNotificationServiceMock, once).sendConfirmationForNewUser();
            mockito.verify(troupeService, once).inviteUserByUserId();
          })
          .nodeify(done);

      });

    });

    it('should allow an new unregistered user to invite connection to a user', function(done) {
      var emailNotificationServiceMock = mockito.spy(testRequire('./services/email-notification-service'));

      var troupeService = mockito.spy(testRequire.withProxies('./services/troupe-service', {
        './email-notification-service': emailNotificationServiceMock
      }));

      var userService = mockito.spy(testRequire('./services/user-service'));

      var signupService = testRequire.withProxies("./services/signup-service", {
        './email-notification-service': emailNotificationServiceMock,
        './troupe-service': troupeService,
        './user-service': userService
      });

     var uri = fixture2.userConfirmed1.getHomeUrl();
     var email = fixture.generateEmail();
     var displayName = fixture.generateName();

     signupService.signupWithAccessRequestToUri(uri, email, displayName)
       .then(function() {

        mockito.verify(userService, once).findOrCreateUserForEmail();
        mockito.verify(emailNotificationServiceMock, once).sendConfirmationForNewUser();
        mockito.verify(troupeService, once).inviteUserByUserId();
       })
       .nodeify(done);

    });

    it('should allow an new unregistered user to request access to a troupe', function(done) {
      fixtureLoader.use({
        'troupe1': { }
      }).then(function(fixture) {

        var emailNotificationServiceMock = mockito.spy(testRequire('./services/email-notification-service'));

        var troupeService = mockito.spy(testRequire.withProxies('./services/troupe-service', {
          './email-notification-service': emailNotificationServiceMock
        }));

        var userService = mockito.spy(testRequire('./services/user-service'));

        var signupService = testRequire.withProxies("./services/signup-service", {
          './email-notification-service': emailNotificationServiceMock,
          './troupe-service': troupeService,
          './user-service': userService
        });

        var uri = fixture.troupe1.uri;
        var email = fixture.generateEmail();
        var displayName = fixture.generateName();

        return signupService.signupWithAccessRequestToUri(uri, email, displayName)
          .then(function() {

            mockito.verify(userService, once).findOrCreateUserForEmail();
            mockito.verify(emailNotificationServiceMock, once).sendConfirmationForNewUser();
            mockito.verify(troupeService, once).addRequest();

          })
          .fin(function() {
            fixture.cleanup();
            // CLEANUP FIXTURE
          });

      })
      .nodeify(done);

    });
  });


  after(function() {
    fixture2.cleanup();
  });



});