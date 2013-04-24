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


function testInviteRejection(email, userStatus, done) {
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

          troupeService.rejectRequest(request, function(err) {
            if(err) return done(err);

            mockito.verifyZeroInteractions(emailNotificationServiceMock);

            persistence.Troupe.findOne({ uri: 'testtroupe1' }, function(err, troupe2) {
              if(err) return done(err);

              assert(!troupeService.userHasAccessToTroupe(user, troupe2), 'User has not been granted access to the troupe');
              assert(!troupeService.userIdHasAccessToTroupe(user.id, troupe2), 'User has not been granted access to the troupe');

              persistence.Request.findOne({ id: request.id }, function(err, r2) {
                if(err) return done(err);

                assert(!r2, 'Request should have been deleted');
                return done();
              });
            });

          });
        });

      });
  });
}

function cleanup(done) {
  persistence.User.findOne({ email: "testuser@troupetest.local" }, function(e, user) {
    if(e) return done(e);
    if(!user) return done("User not found");
    persistence.User.findOne({ email: "testuser2@troupetest.local" }, function(e, user2) {
      if(e) return done(e);
      if(!user2) return done("User2 not found");

      persistence.Troupe.update({ uri: "testtroupe1" }, { users: [ { userId: user._id }, { userId: user2._id } ] }, function(err, numResults) {
        if(err) return done(err);
        if(numResults !== 1) return done("Expected one update result");
        done();
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

  describe('#rejectRequest()', function() {
    it('should delete a rejected request from an ACTIVE user', function(done) {
      var nonExistingEmail = 'testuser' + Date.now() + '@troupetest.local';
      testInviteRejection(nonExistingEmail, 'ACTIVE', done);
    });

    it('should delete a rejected request from an UNCONFIRMED user', function(done) {
      var nonExistingEmail = 'testuser' + Date.now() + '@troupetest.local';
      testInviteRejection(nonExistingEmail, 'UNCONFIRMED', done);
    });
  });

  describe('#validateTroupeEmail()', function() {
    it('should validate correctly for a known user', function(done) {
      return done();
      var troupeService = testRequire('./services/troupe-service');

      troupeService.validateTroupeEmail({
        from: 'testuser@troupetest.local',
        to: 'testtroupe1@troupetest.local'
      }, function(err, fromUser) {
        if(err) return done(err);

        assert(fromUser, 'Validation failed but should have succeeded');
        done();
      });
    });

    it('should not validate for an unknown user', function(done) {
      var nonExistingEmail = 'testuser' + Date.now() + '@troupetest.local';

      var troupeService = testRequire('./services/troupe-service');

      troupeService.validateTroupeEmail({
        from: nonExistingEmail,
        to: 'testtroupe1@troupetest.local'
      }, function(err, fromUser) {
        if(err) {
          if(err === "Access denied") {
            return done();
          }

          return done(err);
        }
        assert(!fromUser, 'Validation succeeded but should have failed');
        done();
      });
    });

    it('should delete a rejected request from an UNCONFIRMED user', function(done) {
      var nonExistingEmail = 'testuser' + Date.now() + '@troupetest.local';
      testInviteRejection(nonExistingEmail, 'UNCONFIRMED', done);
    });
  });

  describe('#updateFavourite()', function() {
    it('should add a troupe to favourites',function(done) {

      var troupeService = testRequire('./services/troupe-service');


      persistence.Troupe.findOne({ uri: 'testtroupe1' }, function(err, troupe) {
        if(err) return done(err);
        if(!troupe) return done("Cannot find troupe");

        persistence.User.findOne({ email: 'testuser@troupetest.local' }, function(err, user) {
          if(err) return done(err);
          if(!user) return done("Cannot find user");

          function fav(val, callback) {
            troupeService.updateFavourite(user.id, troupe.id, val, function(err) {
              if(err) return done(err);

              troupeService.findFavouriteTroupesForUser(user.id, function(err, favs) {
                if(err) return done(err);

                var isInTroupe = !!favs[troupe.id];
                assert(isInTroupe === val, 'Troupe should ' + (val? '': 'not ') + 'be a favourite');
                callback();
              });
            });
          }

          fav(true, function() {
            fav(true, function() {
              fav(false, function() {
                fav(false, function() {
                  done();
                });
              });
            });
          });

        });
      });

    });


  });

  afterEach(function(done) {
    console.log("Cleaning up troupe-service test");
    cleanup(done);
  });


});