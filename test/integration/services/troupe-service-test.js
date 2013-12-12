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


  describe('#updateFavourite()', function() {
    it('should add a troupe to favourites',function(done) {

      var troupeService = testRequire('./services/troupe-service');


      function fav(val, callback) {
        troupeService.updateFavourite(fixture.user1.id, fixture.troupe1.id, val, function(err) {
          if(err) return done(err);

          troupeService.findFavouriteTroupesForUser(fixture.user1.id, function(err, favs) {
            if(err) return done(err);

            var isInTroupe = !!favs[fixture.troupe1.id];
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

  describe('#findBestTroupeForUser', function() {
    it('#01 should return null when a user has no troupes',function(done) {

      var troupeService = testRequire('./services/troupe-service');
      var userService = testRequire('./services/user-service');

      userService.saveLastVisitedTroupeforUserId(fixture.userNoTroupes.id, fixture.troupe1.id, function(err) {
        if(err) return done(err);


        troupeService.findBestTroupeForUser(fixture.userNoTroupes, function(err, troupe) {
          if(err) return done(err);
          assert(troupe === null, 'Expected the troupe to be null');
          done();
        });
      });


    });

    it('#02 should return return the users last troupe when they have one',function(done) {
      var troupeService = testRequire('./services/troupe-service');
      var userService = testRequire('./services/user-service');

      userService.saveLastVisitedTroupeforUserId(fixture.user1.id, fixture.troupe1.id, function(err) {
        if(err) return done(err);

        troupeService.findBestTroupeForUser(fixture.user1, function(err, troupe) {
          if(err) return done(err);

          assert(troupe !== null, 'Expected the troupe not to be null');
          assert(troupe.uri == fixture.troupe1.uri, 'Expected the troupe uri to be testtroupe1');
          done();
        });

      });

    });


    it('#03 should return the users something when the user has troupes, but no last troupe',function(done) {
      var troupeService = testRequire('./services/troupe-service');


      troupeService.findBestTroupeForUser(fixture.user1, function(err, troupe) {
        if(err) return done(err);

        assert(troupe !== null, 'Expected the troupe not to be null');
        done();
      });

    });

  });

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


  describe('#removeUserFromTroupe()', function() {
    it('#01 should be able to remove a user from a troupe', function(done) {
      var troupeService = testRequire('./services/troupe-service');

      troupeService.removeUserFromTroupe(fixture.troupeForDeletion.id, fixture.user1.id, function(err) {
        if(err) return done(err);

        troupeService.findById(fixture.troupeForDeletion.id, function(err, troupe) {
          if(err) return done(err);

          var earlier = new Date(Date.now() - 10000);

          assert.strictEqual(1, troupe.users.length);
          assert.equal(fixture.user2.id, troupe.users[0].userId);

          persistence.TroupeRemovedUser.find({
            troupeId: troupe.id,
            userId: fixture.user1.id,
            dateDeleted: { $gt: earlier }
          }, function(err, entry) {
            if(err) return done(err);

            assert(entry, 'Expected a troupeRemoved entry');
            done();

          });
        });
      });

    });

  });


  describe('#deleteTroupe()', function() {
    it('#01 should allow an ACTIVE troupe with a single user to be deleted', function(done) {
      var troupeService = testRequire('./services/troupe-service');

      troupeService.deleteTroupe(fixture.troupeForDeletion2, function(err) {
        if(err) return done(err);

        troupeService.findById(fixture.troupeForDeletion2.id, function(err, troupe) {
          if(err) return done(err);

          var earlier = new Date(Date.now() - 10000);

          persistence.TroupeRemovedUser.find({
            troupeId: troupe.id,
            userId: fixture.user1.id,
            dateDeleted: { $gt: earlier }
          }, function(err, entry) {
            if(err) return done(err);

            assert(entry, 'Expected a troupeRemoved entry');

            assert.equal('DELETED', troupe.status);
            assert.strictEqual(0, troupe.users.length);

            done();

          });
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

  xdescribe('#findAllUserIdsForUnconnectedImplicitContacts', function() {
    it('should find users who are implicitly connected to one another', function(done) {
      var troupeService = testRequire('./services/troupe-service');

      persistence.Troupe.createQ({ displayName: 'Test User 2', email:  'testuser-b' + Date.now() + '@troupetest.local', status: 'ACTIVE' })
        .then(function(otherUser) {

          return persistence.Troupe.createQ({ displayName: 'Test User', email:  'testuser' + Date.now() + '@troupetest.local', status: 'ACTIVE' })
            .then(function(user) {

              return troupeService.findOrCreateOneToOneTroupe(otherUser.id, user.id)
                .then(function() {

                  var troupe = new persistence.Troupe({ status: 'ACTIVE' });
                  troupe.addUserById(fixture.user1.id);
                  troupe.addUserById(user.id);
                  troupe.addUserById(otherUser.id);
                  return troupe.saveQ()
                    .then(function() {

                      return troupeService.findAllUserIdsForUnconnectedImplicitContacts(user.id)
                        .then(function(userIds) {
                          // The fixture.user1 user should be included as both users share a troupe
                          // but don't have a explicit connection
                          // The otherUser user should not be included as they share a troupe but DO
                          // have an explicit connection (see the createOneToOneTroupe call!)
                          assert.equal(userIds.length, 1);
                          assert.equal(userIds[0], fixture.user1.id);
                        });
                    });

                });


            });
        })
        .nodeify(done);

    });

  });

  describe('#findAllImplicitContactUserIds', function() {
    var fixture2 = {};

    before(fixtureLoader(fixture2, { user1: { }, user2: { }, troupe1: { users: ['user1', 'user2' ] } }));

    it('should work as expected', function(done) {
      var troupeService = testRequire('./services/troupe-service');

      troupeService.findAllImplicitContactUserIds(fixture2.user1.id)
        .then(function(userIds) {
          assert.equal(userIds.length, 1);
          assert.equal(userIds[0], fixture2.user2.id);
        })
        .nodeify(done);

    });

    after(function() {
      fixture2.cleanup();
    });

  });

  describe('#findAllConnectedUserIdsForUserId', function() {
    var fixture2 = {};

    before(fixtureLoader(fixture2, { user1: { }, user2: { }, troupe1: { oneToOne: true, users: ['user1', 'user2' ] } }));

    it('should work as expected', function(done) {
      var troupeService = testRequire('./services/troupe-service');

      troupeService.findAllConnectedUserIdsForUserId(fixture2.user1.id)
        .then(function(userIds) {
          assert.equal(userIds.length, 1);
          assert.equal(userIds[0], fixture2.user2.id);
        })
        .nodeify(done);

    });

    after(function() {
      fixture2.cleanup();
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
