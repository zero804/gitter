#!/usr/bin/env mocha --ignore-leaks

/*jslint node:true, unused:true*/
/*global describe:true, it:true, afterEach:true, before:true */
"use strict";

var testRequire = require('../test-require');

var assert = require("assert");
var persistence = testRequire("./services/persistence-service");
var mockito = require('jsmockito').JsMockito;

var times = mockito.Verifiers.times;
var once = times(1);

var fixture = {};

function testRequestAcceptance(email, userStatus, emailNotificationConfirmationMethod, done) {
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


function testRequestRejection(email, userStatus, done) {
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

      testRequestAcceptance(nonExistingEmail, 'ACTIVE', 'sendRequestAcceptanceToUser', done);
    });

    it('should allow an UNCONFIRMED user (without a confirmation code) request to be accepted', function(done) {
      var nonExistingEmail = 'testuser' + Date.now() + '@troupetest.local';

      testRequestAcceptance(nonExistingEmail, 'UNCONFIRMED', 'sendConfirmationForNewUserRequest', done);
    });


    it('should allow an PROFILE_NOT_COMPLETED user (without a confirmation code) request to be accepted', function(done) {
      var nonExistingEmail = 'testuser' + Date.now() + '@troupetest.local';

      testRequestAcceptance(nonExistingEmail, 'PROFILE_NOT_COMPLETED', 'sendRequestAcceptanceToUser', done);
    });

  });

  describe('#rejectRequest()', function() {
    it('should delete a rejected request from an ACTIVE user', function(done) {
      var nonExistingEmail = 'testuser' + Date.now() + '@troupetest.local';
      testRequestRejection(nonExistingEmail, 'ACTIVE', done);
    });

    it('should delete a rejected request from an UNCONFIRMED user', function(done) {
      var nonExistingEmail = 'testuser' + Date.now() + '@troupetest.local';
      testRequestRejection(nonExistingEmail, 'UNCONFIRMED', done);
    });
  });

  describe('#validateTroupeEmail()', function() {
    it('should validate correctly for a known user', function(done) {
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
      testRequestRejection(nonExistingEmail, 'UNCONFIRMED', done);
    });
  });

  describe('#updateFavourite()', function() {
    it('should add a troupe to favourites',function(done) {

      var troupeService = testRequire('./services/troupe-service');

      persistence.Troupe.findOne({ uri: 'testtroupe1' }, function(err, troupe) {
        if(err) return done(err);
        if(!troupe) return done("Cannot find troupe");

        function fav(val, callback) {
          troupeService.updateFavourite(fixture.user1.id, troupe.id, val, function(err) {
            if(err) return done(err);

            troupeService.findFavouriteTroupesForUser(fixture.user1.id, function(err, favs) {
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

  describe('#findBestTroupeForUser', function() {
    it('#01 should return null when a user has no troupes',function(done) {

      var troupeService = testRequire('./services/troupe-service');
      var userService = testRequire('./services/user-service');


      persistence.User.findOne({ email: 'testuserwithnotroupes@troupetest.local' }, function(err, user) {
        if(err) return done(err);
        if(!user) return done("Cannot find testuserwithnotroupes@troupetest.local");

        persistence.Troupe.findOne({ uri: 'testtroupe1' }, function(err, troupe) {
          if(err) return done(err);
          if(!troupe) return done("Cannot find troupe");

          userService.saveLastVisitedTroupeforUser(user.id, troupe, function(err) {
            if(err) return done(err);


            troupeService.findBestTroupeForUser(user, function(err, troupe) {
              if(err) return done(err);
              assert(troupe === null, 'Expected the troupe to be null');
              done();
            });
          });

        });

      });

    });

    it('#02 should return return the users last troupe when they have one',function(done) {
      var troupeService = testRequire('./services/troupe-service');
      var userService = testRequire('./services/user-service');

      persistence.User.findOne({ email: 'testuser@troupetest.local' }, function(err, user) {
        if(err) return done(err);
        if(!user) return done("Cannot find testuser@troupetest.local");

        persistence.Troupe.findOne({ uri: 'testtroupe1' }, function(err, troupe) {
          if(err) return done(err);
          if(!troupe) return done("Cannot find troupe");

          userService.saveLastVisitedTroupeforUser(user.id, troupe, function(err) {
            if(err) return done(err);

            troupeService.findBestTroupeForUser(user, function(err, troupe) {
              if(err) return done(err);

              assert(troupe !== null, 'Expected the troupe not to be null');
              assert(troupe.uri == 'testtroupe1', 'Expected the troupe uri to be testtroupe1');
              done();
            });

          });
        });

      });

    });


    it('#03 should return the users something when the user has troupes, but no last troupe',function(done) {
      var troupeService = testRequire('./services/troupe-service');

      persistence.User.findOneAndUpdate({ email: 'testuser@troupetest.local' }, { lastTroupe: null }, function(err, user) {
        if(err) return done(err);
        if(!user) return done("Cannot find testuser@troupetest.local");

        persistence.Troupe.findOne({ uri: 'testtroupe1' }, function(err, troupe) {
          if(err) return done(err);
          if(!troupe) return done("Cannot find troupe");

          troupeService.findBestTroupeForUser(user, function(err, troupe) {
            if(err) return done(err);

            assert(troupe !== null, 'Expected the troupe not to be null');
            done();
          });

        });

      });

    });

  });

  describe('#createNewTroupeForExistingUser', function() {
    var troupeService = testRequire('./services/troupe-service');

    it('should handle the upgrade of a oneToOneTroupe', function(done) {

      troupeService.findOrCreateOneToOneTroupe(fixture.user1.id, fixture.user2.id, function(err, troupe) {
        if(err) return done(err);
        if(!troupe) return done('Cannot find troupe');

        var name = 'Upgraded one-to-one ' + new Date();
        var inviteEmail =  'testinvite' + Date.now() + '@troupetest.local';

        troupeService.createNewTroupeForExistingUser({
          user: fixture.user1,
          name: name,
          oneToOneTroupeId: troupe.id,
          invites: [
            { displayName: 'John McTestaroo', email: inviteEmail }
          ]
        }, function(err, newTroupe) {
          if(err) return done(err);
          if(!newTroupe) return done('New troupe not created');

          assert(newTroupe.name === name, 'New Troupe name is wrong');

          assert(troupeService.userIdHasAccessToTroupe(fixture.user1.id, newTroupe), 'User1 is supposed to be in the new troupe');
          assert(troupeService.userIdHasAccessToTroupe(fixture.user2.id, newTroupe), 'User2 is supposed to be in the new troupe');

          persistence.Invite.findOne({ email: inviteEmail, troupeId: newTroupe.id }, function(err, invite) {
            if(err) return done(err);
            assert(invite, 'Could not find the invite');
            assert(invite.displayName === 'John McTestaroo', 'Invite has an incorrect displayName');

            troupeService.acceptInvite(invite.code, newTroupe.uri, function(err, user, alreadyUsed) {
              if(err) return done(err);
              assert(!alreadyUsed, 'Expected alreadyUsed to be falsey');
              assert(user, 'Expected the user to be confirmed');

              // The only reason this should work is that the user should still be PROFILE_NOT_COMPLETED
              troupeService.acceptInvite(invite.code, newTroupe.uri, function(err, user, alreadyUsed) {
                if(err) return done(err);
                assert(!alreadyUsed, 'Expected alreadyUsed to be falsey');
                assert(user, 'Expected the user to be returned');

                persistence.User.update({ _id: user._id }, { status: 'ACTIVE'}, function(err, numResults) {
                  if(err) return done(err);
                  if(numResults !== 1) return done("Expected one update result");

                  troupeService.acceptInvite(invite.code, newTroupe.uri, function(err, user, alreadyUsed) {
                    if(err) return done(err);

                    assert(!user, 'User should not have been returned');
                    assert(alreadyUsed, 'Expected alreadyUsed to be true');
                    done();
                  });

                });

              });
            });


          });
        });


      });

    });

    it('should handle the creation of a new troupe', function(done) {

      var name = 'Test Troupe for Existing user ' + new Date();
      var inviteEmail =  'testinvite' + Date.now() + '@troupetest.local';

      troupeService.createNewTroupeForExistingUser({
        user: fixture.user1,
        name: name,
        invites: [
          { displayName: 'John McTestaroo', email: inviteEmail }
        ]
      }, function(err, newTroupe) {
        if(err) return done(err);
        if(!newTroupe) return done('New troupe not created');

        assert(newTroupe.name === name, 'New Troupe name is wrong');

        assert(troupeService.userIdHasAccessToTroupe(fixture.user1.id, newTroupe), 'User1 is supposed to be in the new troupe');

        persistence.Invite.findOne({ email: inviteEmail, troupeId: newTroupe.id }, function(err, invite) {
          if(err) return done(err);
          assert(invite, 'Could not find the invite');
          assert(invite.displayName === 'John McTestaroo', 'Invite has an incorrect displayName');

          newTroupe.remove(function() {
            done();
          });

        });

      });


    });

  });


  describe('#removeUserFromTroupe()', function() {
    it('#01 should be able to remove a user from a troupe', function(done) {
      var troupeService = testRequire('./services/troupe-service');

      var troupe = new persistence.Troupe({ status: 'ACTIVE' });
      troupe.addUserById(fixture.user1.id);
      troupe.addUserById(fixture.user2.id);
      troupe.save(function(err) {
        if(err) return done(err);

        troupeService.removeUserFromTroupe(troupe.id, fixture.user1.id, function(err) {
          if(err) return done(err);

          troupeService.findById(troupe.id, function(err, troupe) {
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

              troupe.remove(function() {
                done();
              });

            });
          });
        });
      });
    });

    it('#02 should not remove a user from a troupe if the user is the last user in the troupe', function(done) {
      var troupeService = testRequire('./services/troupe-service');

      var troupe = new persistence.Troupe({ status: 'ACTIVE' });
      troupe.addUserById(fixture.user1.id);
      troupe.save(function(err) {
        if(err) return done(err);

        troupeService.removeUserFromTroupe(troupe.id, fixture.user1.id, function(err) {
          assert(err);

          troupe.remove(function() {
            done();
          });

        });
      });
    });
  });


  describe('#deleteTroupe()', function() {
    it('#01 should allow an ACTIVE troupe with a single user to be deleted', function(done) {
      var troupeService = testRequire('./services/troupe-service');

      var troupe = new persistence.Troupe({ status: 'ACTIVE' });
      troupe.addUserById(fixture.user1.id);
      troupe.save(function(err) {
        if(err) return done(err);

        troupeService.deleteTroupe(troupe, function(err) {
          if(err) return done(err);

          troupeService.findById(troupe.id, function(err, troupe) {
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

              troupe.remove(function() {
                done();
              });

            });
          });
        });
      });
    });

    it('#02 should NOT allow an ACTIVE troupe with a two users to be deleted', function(done) {
      var troupeService = testRequire('./services/troupe-service');

      var troupe = new persistence.Troupe({ status: 'ACTIVE' });
      troupe.addUserById(fixture.user1.id);
      troupe.addUserById(fixture.user2.id);

      troupe.save(function(err) {
        if(err) return done(err);

        troupeService.deleteTroupe(troupe, function(err) {
          assert(err);
          done();
        });
      });
    });
  });

  before(function(done) {
    persistence.User.findOne({ email: 'testuser@troupetest.local' }, function(err, user1) {
      if(err) return done(err);

      fixture.user1 = user1;

      persistence.User.findOne({ email: 'testuser2@troupetest.local' }, function(err, user2) {
        if(err) return done(err);

        fixture.user2 = user2;
        done();

      });
    });
  });

  afterEach(function(done) {
    cleanup(done);
  });


});