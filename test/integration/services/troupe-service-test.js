#!/usr/bin/env mocha --ignore-leaks

/*jslint node:true, unused:true*/
/*global describe:true, it:true, afterEach:true, before:true */
"use strict";


var testRequire = require('../test-require');
var fixtureLoader = require('../test-fixtures');

var Q = require("Q");
var assert = require("assert");
var persistence = testRequire("./services/persistence-service");
var mockito = require('jsmockito').JsMockito;

var times = mockito.Verifiers.times;
var once = times(1);

Q.longStackSupport = true;

var times = mockito.Verifiers.times;
var once = times(1);
var twice = times(2);
var thrice = times(3);

var fixture = {};

function testDelayedInvite(email, troupeUri, isOnline, done) {
  var emailNotificationServiceMock = mockito.spy(testRequire('./services/email-notification-service'));
  var troupeService = testRequire.withProxies("./services/troupe-service", {
    './email-notification-service': emailNotificationServiceMock,
    './presence-service': {
      categorizeUsersByOnlineStatus: function(userIds, callback) {
          var map = {};
          for (var a = 0; a < userIds.length; a++)
            map[userIds[a]] = isOnline;
          callback(null, map);
        }
      }
  });

  persistence.Troupe.findOne({ uri: troupeUri }, function(err, troupe) {
    if(err) return done(err);

    persistence.User.create({
      email: email,
      displayName: 'Test User ' + new Date(),
      confirmationCode: null,
      status: "ACTIVE" }, function(err, user) {
        if(err) return done(err);

        troupeService.createInvite(troupe, { fromUser: fixture.user1, userId: user.id }, function(err, invite) {
          if(err) return done(err);

          if (isOnline) {
            assert(!invite.emailSentAt, "The emailSentAt property should be null");
            mockito.verifyZeroInteractions(emailNotificationServiceMock);
          } else {
            assert(invite.emailSentAt, "The emailSentAt property should not be null");
            mockito.verify(emailNotificationServiceMock, once);
          }

          troupeService.sendPendingInviteMails(0, function(err, count) {
            if (err) return done(err);

            assert(count >= 1, 'Send pending invite emails returned ' + count);

            done();
          });

        });

      });
  });
}

function testInviteAcceptance(email, done) {
  var troupeUri = 'testtroupe3';
  var emailNotificationServiceMock = mockito.spy(testRequire('./services/email-notification-service'));
  var troupeService = testRequire.withProxies("./services/troupe-service", {
    './email-notification-service': emailNotificationServiceMock
  });

  persistence.Troupe.findOne({ uri: troupeUri }, function(err, troupe) {
    if(err) return done(err);

    persistence.User.create({
      email: email,
      displayName: 'Test User ' + new Date(),
      confirmationCode: null,
      status: "ACTIVE" }, function(err, user) {
        if(err) return done(err);

        troupeService.createInvite(troupe, { fromUser: fixture.user1, userId: user.id }, function(err, invite) {
          if(err) return done(err);

          troupeService.acceptInviteForAuthenticatedUser(user, invite.id, function(err) {
            if(err) return done(err);

            persistence.Troupe.findOne({ uri: troupeUri }, function(err, troupe2) {
              if(err) return done(err);

              assert(troupeService.userHasAccessToTroupe(user, troupe2), 'User has not been granted access to the troupe');
              assert(troupeService.userIdHasAccessToTroupe(user.id, troupe2), 'User has not been granted access to the troupe');

              persistence.Invite.findOne({ id: invite.id }, function(err, r2) {
                if(err) return done(err);

                assert(!r2, 'Invite should be deleted');
                return done();
              });
            });

          });
        });

      });
  });
}

function testInviteRejection(email, done) {
  var troupeUri = 'testtroupe3';
  var emailNotificationServiceMock = mockito.spy(testRequire('./services/email-notification-service'));
  var troupeService = testRequire.withProxies("./services/troupe-service", {
    './email-notification-service': emailNotificationServiceMock
  });

  persistence.Troupe.findOne({ uri: troupeUri }, function(err, troupe) {
    if(err) return done(err);

    persistence.User.create({
      email: email,
      displayName: 'Test User ' + new Date(),
      confirmationCode: null,
      status: "ACTIVE" }, function(err, user) {
        if(err) return done(err);

        troupeService.createInvite(troupe, { fromUser: fixture.user1, userId: user.id }, function(err, invite) {
          if(err) return done(err);

          troupeService.rejectInviteForAuthenticatedUser(user, invite.id, function(err) {
            if(err) return done(err);

            persistence.Troupe.findOne({ uri: troupeUri }, function(err, troupe2) {
              if(err) return done(err);

              assert(!troupeService.userHasAccessToTroupe(user, troupe2), 'User has not been granted access to the troupe');
              assert(!troupeService.userIdHasAccessToTroupe(user.id, troupe2), 'User has not been granted access to the troupe');

              persistence.Invite.findOne({ id: invite.id }, function(err, r2) {
                if(err) return done(err);

                assert(!r2, 'Invite should be deleted');
                return done();
              });
            });

          });
        });

      });
  });
}

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

      return troupeService.addRequest(troupe, user.id)
        .then(function(request) {
          return troupeService.acceptRequest(request);
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


function testRequestRejection(email, userStatus, done) {
  var emailNotificationServiceMock = mockito.spy(testRequire('./services/email-notification-service'));
  var troupeService = testRequire.withProxies("./services/troupe-service", {
    './email-notification-service': emailNotificationServiceMock
  });

  persistence.User.create({
    email: email,
    displayName: 'Test User ' + new Date(),
    confirmationCode: null,  // IMPORTANT. This is the point of the test!!!
    status: userStatus }, function(err, user) {
      if(err) return done(err);

      troupeService.addRequest(fixture.troupe1, user.id)
        .then(function(request) {

        troupeService.rejectRequest(request)
          .then(function() {
            mockito.verifyZeroInteractions(emailNotificationServiceMock);

            assert(!troupeService.userHasAccessToTroupe(user, fixture.troupe2), 'User has not been granted access to the troupe');
            assert(!troupeService.userIdHasAccessToTroupe(user.id, fixture.troupe2), 'User has not been granted access to the troupe');

            persistence.Request.findOne({ id: request.id }, function(err, r2) {
              if(err) return done(err);

              assert(!r2, 'Request should have been deleted');
              return done();
            });

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

      testRequestAcceptance(nonExistingEmail, 'UNCONFIRMED', 'sendRequestAcceptanceToUser', done);
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

  describe('#acceptInviteForAuthenticatedUser', function() {
    it('should delete an invite and add user to the troupe', function(done) {
      var nonExistingEmail = 'testuser' + Date.now() + '@troupetest.local';
      testInviteAcceptance(nonExistingEmail, done);
    });
  });


  describe('#acceptInvite', function() {
    it('should make an UNCONFIRMED user PROFILE_NOT_COMPLETED on accepting an invite and should update any unconfirmed invites to that user', function(done) {
      var emailNotificationServiceMock = mockito.spy(testRequire('./services/email-notification-service'));

      var troupeService = testRequire.withProxies("./services/troupe-service", {
        './email-notification-service': emailNotificationServiceMock
      });

      // Create a new UNCONFIRMED user
      persistence.User.createQ({
          email: 'test' + Date.now() + '@troupetest.local',
          displayName: 'Test User ' + new Date(),
          confirmationCode: null,
          status: 'UNCONFIRMED' })
        .then(function(user) {

          // Have another user invite them to a one to one chat
          return troupeService.createInvite(null, {
            fromUser: fixture.user1,
            userId: user.id
          }).then(function(invite) {
            mockito.verify(emailNotificationServiceMock).sendConnectInvite();

            // Now have the new UNCONFIRMED USER invite someone to connect
            return troupeService.createInvite(null, {
              fromUser: user,
              userId: fixture.user2.id
            }).then(function(secondInvite) {

              assert.equal(secondInvite.status, 'UNCONFIRMED');

              // Have user one accept the INVITE
              return troupeService.acceptInvite(invite.code, fixture.user1.getHomeUrl())
                .then(function(result) {

                  var user2 = result.user;
                  assert(!result.alreadyUsed, 'Invite has not already been used');
                  assert.equal(user2.id, user.id);
                  assert.equal(user2.status, 'PROFILE_NOT_COMPLETED');

                  return troupeService.findOneToOneTroupe(fixture.user1.id, user2.id)
                    .then(function(newTroupe) {
                      assert(newTroupe, 'A troupe should exist for the users');


                      // Now we should also check that the invites that we UNCONFIRMED have been sent out
                      // and are now set to UNUSED
                      return persistence.Invite.findQ({ fromUserId: user.id })
                        .then(function(invites) {
                          assert(invites.length == 1);
                          assert.equal(invites[0].status, 'UNUSED');
                        });
                    });

                });
            });


          });

        })
        .nodeify(done);
    });
  });

  describe('#rejectInviteForAuthenticatedUser', function() {
    it('should delete and invite without changing the troupe', function(done) {
      var nonExistingEmail = 'testuser' + Date.now() + '@troupetest.local';
      testInviteRejection(nonExistingEmail, done);
    });
  });

  describe('#sendPendingInviteMails', function() {
    it('should send mails for all new invites that were created more than 10 minutes ago, and have not been emailed yet.', function(done) {
      var nonExistingEmail = 'testuser' + Date.now() + '@troupetest.local';
      testDelayedInvite(nonExistingEmail, "testtroupe3", true, done);
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

      troupeService.findOrCreateOneToOneTroupe(fixture.user1.id, fixture.user2.id)
        .spread(function(troupe) {
          if(!troupe) return done('Cannot findOrCreateOneToOneTroupe troupe');

          var name = 'Upgraded one-to-one ' + new Date();
          var inviteEmail =  'testinvite' + Date.now() + '@troupetest.local';

          // Now test the upgrade......
          return troupeService.createNewTroupeForExistingUser({
              user: fixture.user1,
              name: name,
              oneToOneTroupeId: troupe._id,
              invites: [
                { displayName: 'John McTestaroo', email: inviteEmail }
              ]
            })
            .then(function(newTroupe) {
              assert(newTroupe, 'New Troupe not created');
              assert(newTroupe.name === name, 'New Troupe name is wrong');

              assert(troupeService.userIdHasAccessToTroupe(fixture.user1.id, newTroupe), 'User1 is supposed to be in the new troupe');
              assert(troupeService.userIdHasAccessToTroupe(fixture.user2.id, newTroupe), 'User2 is supposed to be in the new troupe');

              return persistence.Invite.findOneQ({ email: inviteEmail, troupeId: newTroupe.id })
                .then(function(invite) {

                  assert(invite, 'Could not find the invite');
                  assert(invite.displayName === 'John McTestaroo', 'Invite has an incorrect displayName');

                  return troupeService.acceptInvite(invite.code, newTroupe.uri)
                    .then(function(result) {
                      var user = result.user;
                      var alreadyUsed = result.alreadyUsed;

                      assert(!alreadyUsed, 'Expected alreadyUsed to be falsey');
                      assert(user, 'Expected the user to be confirmed');

                      // The only reason this should work is that the user should still be PROFILE_NOT_COMPLETED
                      return troupeService.acceptInvite(invite.code, newTroupe.uri)
                        .then(function(result) {
                          var alreadyUsed = result.alreadyUsed;
                          var user = result.user;

                          assert(!alreadyUsed, 'Expected alreadyUsed to be falsey');
                          assert(user, 'Expected the user to be returned');

                          return persistence.User.updateQ({ _id: user._id }, { status: 'ACTIVE'})
                            .spread(function(numResults) {
                              if(numResults !== 1) throw "Expected one update result, got " + numResults;

                              return troupeService.acceptInvite(invite.code, newTroupe.uri)
                                .then(function(result) {
                                  var alreadyUsed = result.alreadyUsed;
                                  var user = result.user;

                                  assert(!user, 'User should not have been returned');
                                  assert(alreadyUsed, 'Expected alreadyUsed to be true');
                                });

                            });

                      });

                    });
                });

            });
        })
        .nodeify(done);


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

  before(fixtureLoader(fixture));


});