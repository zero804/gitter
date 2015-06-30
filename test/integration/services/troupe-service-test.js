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

  describe('#deleteTroupe()', function() {
    it('#01 should allow an ACTIVE troupe with a single user to be deleted', function(done) {
      var troupeService = testRequire('./services/troupe-service');

      troupeService.deleteTroupe(fixture.troupeForDeletion2, function(err) {
        if(err) return done(err);

        troupeService.findById(fixture.troupeForDeletion2.id, function(err, troupe) {
          if(err) return done(err);

          assert.equal('DELETED', troupe.status);
          assert.strictEqual(0, troupe.users.length);

          done();
        });
      });

    });

    it('#02 should NOT allow an ACTIVE troupe with a two users to be deleted', function(done) {
      var troupeService = testRequire('./services/troupe-service');

      troupeService.deleteTroupe(fixture.troupeForDeletion3, function(err) {
        assert(err);
        done();
      });

    });
  });

  describe('#findAllImplicitContactUserIds', function() {

    it('should work as expected', function(done) {
      var troupeService = testRequire('./services/troupe-service');

      troupeService.findAllImplicitContactUserIds(fixture.user1.id)
        .then(function(userIds) {
          assert.equal(userIds.length, 1);
          assert.equal(userIds[0], fixture.user2.id);
        })
        .nodeify(done);

    });

  });

  describe('#findAllConnectedUserIdsForUserId', function() {

    it('should work as expected', function(done) {
      var troupeService = testRequire('./services/troupe-service');

      troupeService.findAllConnectedUserIdsForUserId(fixture.user1.id)
        .then(function(userIds) {
          assert.equal(userIds.length, 1);
          assert.equal(userIds[0], fixture.user2.id);
        })
        .nodeify(done);

    });

  });



  describe('#indexTroupesByUserIdTroupeId', function() {

    it('should index stuff correctly', function() {
      var troupeService = testRequire('./services/troupe-service');
      var userId = new ObjectID();
      var userIdA = new ObjectID();
      var userIdB = new ObjectID();
      var groupTroupeId1 = new ObjectID();
      var groupTroupeId2 = new ObjectID();
      var oToTroupeId3 = new ObjectID();
      var o2oTroupeId4 = new ObjectID();

      var troupes = [new persistence.Troupe({
        _id: groupTroupeId1
      }), new persistence.Troupe({
        _id: groupTroupeId2,
        oneToOne: false
      }), new persistence.Troupe({
        _id: oToTroupeId3,
        oneToOne: true,
        users: [{ userId: userId }, { userId: userIdA }]
      }), new persistence.Troupe({
        _id: o2oTroupeId4,
        oneToOne: true,
        users: [{ userId: userId }, { userId: userIdB }]
      })];

      var result = troupeService.indexTroupesByUserIdTroupeId(troupes, userId);
      assert(result.oneToOne[userIdA]);
      assert(result.oneToOne[userIdB]);
      assert(!result.oneToOne[userId]);
      assert(result.groupTroupeIds[groupTroupeId1]);
      assert(result.groupTroupeIds[groupTroupeId2]);
      assert(!result.groupTroupeIds[oToTroupeId3]);

    });

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
