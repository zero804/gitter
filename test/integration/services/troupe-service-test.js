#!/usr/bin/env mocha --ignore-leaks
/*jslint node:true, unused:true*/
/*global describe:true, it:true, before:true, after:false */
"use strict";


var testRequire   = require('../test-require');
var fixtureLoader = require('../test-fixtures');
var Q             = require("q");
var assert        = require("assert");
var mockito       = require('jsmockito').JsMockito;
var ObjectID      = require('mongodb').ObjectID;
var persistence   = testRequire("./services/persistence-service");
var mongoUtils    = testRequire("./utils/mongo-utils");
var times         = mockito.Verifiers.times;
var once          = times(1);
var times         = mockito.Verifiers.times;
var once          = times(1);
var fixture       = {};
Q.longStackSupport = true;

function testRequestAcceptance(email, userStatus, emailNotificationConfirmationMethod, done) {
  var emailNotificationServiceMock = mockito.spy(testRequire('./services/email-notification-service'));
  var troupeService = testRequire.withProxies("./services/troupe-service", {
    './email-notification-service': emailNotificationServiceMock
  });

  var troupe = fixture.troupe1;

  persistence.User.createQ({
      email: email,
      displayName: 'Test User ' + new Date(),
      confirmationCode: null,  // IMPORTANT. This is the point of the test!!!
      status: userStatus })
    .then(function(user) {

      return troupeService.addRequest(troupe, user)
        .then(function(request) {


          return persistence.Request.findByIdQ(request.id)
            .then(function(request) {

              if(user.status !== 'UNCONFIRMED')
                return;

              assert(!request, 'request should not exist as user is not confirmed');
              user.status = 'ACTIVE';
              return user.saveQ()
                .then(function() {
                  // Install hooks TODO: fix this!
                  // appEvents.onEmailConfirmed(email, user.id);
                });


            })
            .then(function() {
              // The requests should exist at this point
              return persistence.Request.findByIdQ(request.id)
                .then(function(request) {
                  assert(request, 'request does not exist');

                  return troupeService.acceptRequest(request);

                });
              });


        })
        .then(function() {

          mockito.verify(emailNotificationServiceMock, once)[emailNotificationConfirmationMethod]();

          return persistence.Troupe.findOneQ({ uri: 'testtroupe1' })
            .then(function(troupe2) {

              assert(troupeService.userHasAccessToTroupe(user, troupe2), 'User has not been granted access to the troupe');
              assert(troupeService.userIdHasAccessToTroupe(user.id, troupe2), 'User has not been granted access to the troupe');

            });
        });
    })
    .nodeify(done);
}


describe('troupe-service', function() {


  describe('#createNewTroupeForExistingUser', function() {
    var troupeService = testRequire('./services/troupe-service');

    it('should handle the upgrade of a oneToOneTroupe', function(done) {
      troupeService.findOrCreateOneToOneTroupeIfPossible(fixture.user1.id, fixture.user2.id)
        .spread(function(troupe) {
          if(!troupe) throw 'Cannot findOrCreateOneToOneTroupeIfPossible troupe';
        })
        .nodeify(done);


    });

    // xit('should handle the creation of a new troupe', function(done) {

    //   var name = 'Test Troupe for Existing user ' + new Date();

    //   return troupeService.createNewTroupeForExistingUser({
    //     user: fixture.user1,
    //     name: name
    //   }).then(function(newTroupe) {
    //     if(!newTroupe) return done('New troupe not created');

    //     assert(newTroupe.name === name, 'New Troupe name is wrong');

    //     assert(troupeService.userIdHasAccessToTroupe(fixture.user1.id, newTroupe), 'User1 is supposed to be in the new troupe');
    //   })
    //   .nodeify(done);

    // });

  });

  describe('#findByIdLeanWithAccess', function() {
    var troupeService = testRequire('./services/troupe-service');

    it('should find a room which exists and the user has access', function(done) {
      troupeService.findByIdLeanWithAccess(fixture.troupe1.id, fixture.user1.id)
        .spread(function(room, access) {
          assert.strictEqual(room.id, fixture.troupe1.id);
          assert.strictEqual(access, true);
        })
        .nodeify(done);
    });

    it('should find a room which exists and the does not have access', function(done) {
      troupeService.findByIdLeanWithAccess(fixture.troupe2.id, fixture.user1.id)
        .spread(function(room, access) {
          assert(room);
          assert.strictEqual(room.id, fixture.troupe2.id);
          assert.strictEqual(access, false);
        })
        .nodeify(done);

    });

    it('should not find a room which does not exist, for a user', function(done) {
      troupeService.findByIdLeanWithAccess(mongoUtils.getNewObjectIdString(), fixture.user1.id)
        .spread(function(room, access) {
          assert(!room);
          assert(!access);
        })
        .nodeify(done);
    });

    it('should find a room which exists and for anon', function(done) {
      troupeService.findByIdLeanWithAccess(fixture.troupe2.id, null)
        .spread(function(room, access) {
          assert(room);
          assert(!access);
        })
        .nodeify(done);
    });

    it('should not find a room which does not exist for anon', function(done) {
      troupeService.findByIdLeanWithAccess(mongoUtils.getNewObjectIdString(), null)
        .spread(function(room, access) {
          assert(!room);
          assert(!access);
        })
        .nodeify(done);
    });
  });

  before(fixtureLoader(fixture, {
    user1: {
    },
    user2: {
    },
    user3: {
    },
    userNoTroupes: {
    },
    troupe1: {
      users: ['user1', 'user2']
    },
    troupe2: {
    },
    troupe3: {
    },
    troupeForDeletion: {
      users: ['user1', 'user2']
    },
    troupeForDeletion2: {
      users: ['user1']
    },
    troupeForDeletion3: {
      users: ['user1', 'user2']
    }

  }));
  after(function() { fixture.cleanup(); });

});
