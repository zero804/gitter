#!/usr/bin/env mocha --ignore-leaks
/*jslint node:true, unused:true*/
/*global describe:true, it:true, before:true, after:false */
"use strict";


var testRequire   = require('../test-require');
var fixtureLoader = require('../test-fixtures');
var Q             = require("q");
var assert        = require("assert");
var mockito       = require('jsmockito').JsMockito;
var persistence   = testRequire("./services/persistence-service");
var times         = mockito.Verifiers.times;
var once          = times(1);
var times         = mockito.Verifiers.times;
var once          = times(1);
var fixture       = {};
Q.longStackSupport = true;


function testInviteAcceptance(email, done) {
  var troupeUri = 'testtroupe3';
  var emailNotificationServiceMock = mockito.spy(testRequire('./services/email-notification-service'));
  var troupeService = testRequire("./services/troupe-service");
  var inviteService = testRequire.withProxies("./services/invite-service", {
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

        inviteService.createInvite(troupe, { fromUser: fixture.user1, email: user.email }, function(err, invite) {
          if(err) return done(err);


          return persistence.Invite.findByIdQ(invite.id)
            .then(function(invite) {
              assert(invite, 'Invite does not exist');

              return inviteService.acceptInviteForAuthenticatedUser(user, invite)
                .then(function() {

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
                })
                .fail(done);

            });


        });

      });
  });
}

function testSecondaryInviteAcceptance(email, email2, done) {
  var troupeUri = 'testtroupe3';
  var emailNotificationServiceMock = mockito.spy(testRequire('./services/email-notification-service'));
  var troupeService = testRequire("./services/troupe-service");
  var inviteService = testRequire.withProxies("./services/invite-service", {
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

        inviteService.createInvite(troupe, { fromUser: fixture.user1, email: email2 }, function(err, invite) {
          if(err) return done(err);


          return persistence.Invite.findByIdQ(invite.id)
            .then(function(invite) {
              assert(invite, 'Invite does not exist');

              return inviteService.acceptInviteForAuthenticatedUser(user, invite)
                .then(function() {

                  persistence.Troupe.findOne({ uri: troupeUri }, function(err, troupe2) {
                    if(err) return done(err);

                    assert(troupeService.userHasAccessToTroupe(user, troupe2), 'User has not been granted access to the troupe');
                    assert(troupeService.userIdHasAccessToTroupe(user.id, troupe2), 'User has not been granted access to the troupe');

                    assert(user.hasEmail(email2), "User did not inherit (as secondary) the email address of the invite");

                    persistence.Invite.findOne({ id: invite.id }, function(err, r2) {
                      if(err) return done(err);

                      assert(!r2, 'Invite should be deleted');
                      return done();
                    });
                  });
                })
                .fail(done);

            });


        });

      });
  });
}


function testSecondaryConnectAcceptance(email, email2, done) {
  var emailNotificationServiceMock = mockito.spy(testRequire('./services/email-notification-service'));
  var troupeService = testRequire("./services/troupe-service");
  var inviteService = testRequire.withProxies("./services/invite-service", {
    './email-notification-service': emailNotificationServiceMock
  });

  return persistence.User.createQ({
    email: email,
    displayName: 'Test User ' + new Date(),
    confirmationCode: null,
    status: "ACTIVE" })
      .then(function(user) {

        return inviteService.createInvite(null, { fromUser: fixture.user1, email: email2 })
          .then(function(invite) {

            return persistence.Invite.findByIdQ(invite.id)
              .then(function(invite) {
                assert(invite, 'Invite does not exist');
                assert(invite.fromUserId == fixture.user1.id);

                return inviteService.acceptInviteForAuthenticatedUser(user, invite)
                  .then(function(trp) {
                    assert(invite.fromUserId == fixture.user1.id);

                    return persistence.Troupe.findOneQ({ oneToOne: true, $and: [{ 'users.userId': fixture.user1.id }, { 'users.userId': user.id }] })
                      .then(function(troupe2) {
                        assert(trp.id === troupe2.id);
                        assert(troupeService.userHasAccessToTroupe(user, troupe2), 'User has not been granted access to the troupe');
                        assert(troupeService.userIdHasAccessToTroupe(user.id, troupe2), 'User has not been granted access to the troupe');

                        assert(user.hasEmail(email2), "User did not inherit (as secondary) the email address of the invite");

                        return persistence.Invite.findOneQ({ id: invite.id })
                          .then(function(r2) {
                            assert(!r2, 'Invite should be deleted');
                          });
                      });
                    });
              });
      });
    })
    .nodeify(done);

}

function testInviteRejection(email, done) {
  var troupeUri = 'testtroupe3';
  var emailNotificationServiceMock = mockito.spy(testRequire('./services/email-notification-service'));
  var troupeService = testRequire("./services/troupe-service");
  var inviteService = testRequire.withProxies("./services/invite-service", {
    './email-notification-service': emailNotificationServiceMock
  });
  return persistence.Troupe.findOneQ({ uri: troupeUri })
    .then(function(troupe) {
      return persistence.User.createQ({
          email: email,
          displayName: 'Test User ' + new Date(),
          confirmationCode: null,
          status: "ACTIVE"
        })
        .then(function(user) {
            return inviteService.createInvite(troupe, { fromUser: fixture.user1, userId: user.id })
              .then(function(invite) {
                return persistence.Invite.findByIdQ(invite.id)
                  .then(function(invite) {
                    assert(invite, 'Invite does not exist');

                    return inviteService.rejectInviteForAuthenticatedUser(user, invite)
                      .then(function() {
                        return persistence.Troupe.findOneQ({ uri: troupeUri })
                          .then(function(troupe2) {
                            assert(!troupeService.userHasAccessToTroupe(user, troupe2), 'User has not been granted access to the troupe');
                            assert(!troupeService.userIdHasAccessToTroupe(user.id, troupe2), 'User has not been granted access to the troupe');

                            return persistence.Invite.findOneQ({ id: invite.id })
                              .then(function(r2) {
                                assert(!r2, 'Invite should be deleted');
                              });
                          });

                      });
                  });

              });

          });
      })
    .nodeify(done);
}


xdescribe('troupe-service', function() {

  describe('#acceptInviteForAuthenticatedUser', function() {

    it('should delete an invite and add user to the troupe', function(done) {
      var nonExistingEmail = 'testuser' + Date.now() + '@troupetest.local';
      testInviteAcceptance(nonExistingEmail, done);
    });

    it('should add the invite email address as a secondary address for the logged in user', function(done) {
      var primaryEmail = 'testuser' + Date.now() + '.primary@troupetest.local';
      var secondaryEmail = 'testuser' + Date.now() + '.secondary@troupetest.local';
      testSecondaryInviteAcceptance(primaryEmail, secondaryEmail, done);
    });

    it('should create a one to one troupe after adding the invite email address as a secondary address for the logged in user', function(done) {
      var primaryEmail = 'testuser' + Date.now() + '.primary@troupetest.local';
      var secondaryEmail = 'testuser' + Date.now() + '.secondary@troupetest.local';
      testSecondaryConnectAcceptance(primaryEmail, secondaryEmail, done);
    });

  });


  describe('#acceptInvite', function() {
    it('should handle users inviting non-registered users to connect multiple times, while only creating a single invite', function(done) {
      var inviteService = testRequire("./services/invite-service");

      var email =  'test' + Date.now() + '@troupetest.local';

      // Have another user invite them to a one to one chat
      return inviteService.createInvite(null, {
          fromUser: fixture.user1,
          email: email
        }).then(function(invite1) {
          return inviteService.createInvite(null, {
              fromUser: fixture.user1,
              email: email
            }).then(function(invite2) {
              // Don't create a second invite - should return the same one
              assert.equal(invite1.id, invite2.id);

              return inviteService.createInvite(null, {
                  fromUser: fixture.user2,
                  email: email
                }).then(function(invite3) {
                  assert.notEqual(invite1.id, invite3.id);
                });

            });
        }).nodeify(done);
    });

    it('should handle users inviting registered users to connect multiple times, and deal with troupe and onetoone invites correctly', function(done) {
      var inviteService = testRequire("./services/invite-service");

      // Have another user invite them to a one to one chat
      return inviteService.createInvite(null, {
          fromUser: fixture.user1,
          userId: fixture.userNoTroupes.id
        }).then(function(invite1) {
          return inviteService.createInvite(fixture.troupe1, {
              fromUser: fixture.user1,
              userId: fixture.userNoTroupes.id
            }).then(function(invite2) {
              // Make sure there are now two invites
              assert.notEqual(invite1.id, invite2.id);

              return inviteService.createInvite(fixture.troupe1, {
                  fromUser: fixture.user1,
                  userId: fixture.userNoTroupes.id
                }).then(function(invite3) {
                  // Should reuse the last invite
                  assert.equal(invite2.id, invite3.id);

                  return inviteService.createInvite(null, {
                      fromUser: fixture.user1,
                      userId: fixture.userNoTroupes.id
                    }).then(function(invite4) {
                      // Should reuse the first invite
                      assert.equal(invite1.id, invite4.id);
                    });

                });

            });
        }).nodeify(done);
    });

    it('When two users with implicit connections invite, it should simply create a troupe for them and return { ignored: true }', function(done) {
      var inviteService = testRequire("./services/invite-service");
      var troupeService = testRequire("./services/troupe-service");

      // Have another user invite them to a one to one chat
      return inviteService.createInvite(null, {
          fromUser: fixture.user1,
          userId: fixture.user2.id
        }).then(function(invite1) {
          assert(invite1, 'Expected a result');
          assert.strictEqual(invite1.ignored, true);

          return troupeService.findOneToOneTroupe(fixture.user1.id, fixture.user2.id)
            .then(function(troupe) {
              assert(troupe);
            });

        }).nodeify(done);
    });

    it('should make an UNCONFIRMED user PROFILE_NOT_COMPLETED on accepting a one-to-one invite and should update any unconfirmed invites to that user', function(done) {
      var emailNotificationServiceMock = mockito.spy(testRequire('./services/email-notification-service'));
      var troupeService = testRequire("./services/troupe-service");

      var inviteService = testRequire.withProxies("./services/invite-service", {
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
          return inviteService.createInvite(null, {
            fromUser: fixture.user1,
            userId: user.id
          }).then(function(invite) {
            mockito.verify(emailNotificationServiceMock).sendConnectInvite();

            // Now have the new UNCONFIRMED USER invite someone to connect
            return inviteService.createInvite(null, {
              fromUser: user,
              userId: fixture.user2.id
            }).then(function(secondInvite) {

              assert.equal(secondInvite.status, 'UNUSED');

              // Make sure that the invite is in the InviteUnconfirmed collection
              return persistence.InviteUnconfirmed.findByIdQ(secondInvite._id)
                .then(function(invite) {
                  assert(invite);
                })
                .then(function() {
                  // Have user one accept the INVITE
                  return inviteService.acceptInvite(invite.code, fixture.user1.getHomeUrl())
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


          });

        })
        .nodeify(done);
    });

    it('should make an UNCONFIRMED user PROFILE_NOT_COMPLETED on accepting a troupe invite and should update any unconfirmed invites to that user', function(done) {
      var emailNotificationServiceMock = mockito.spy(testRequire('./services/email-notification-service'));
      var troupeService = testRequire("./services/troupe-service");

      var inviteService = testRequire.withProxies("./services/invite-service", {
        './email-notification-service': emailNotificationServiceMock
      });

      var email = 'test' + Date.now() + '@troupetest.local';
      var displayName =  'Test User ' + new Date();

      // Have another user invite them to a one to one chat
      return inviteService.createInvite(fixture.troupe1, {
        fromUser: fixture.user1,
        email: email,
        displayName: displayName
      }).then(function(invite) {
        assert.equal(invite.status, 'UNUSED');

        mockito.verify(emailNotificationServiceMock).sendInvite();

        // Now have the new UNCONFIRMED USER invite someone to connect
        return inviteService.createInvite(fixture.troupe2, {
          fromUser: fixture.user2,
          email: email,
          displayName: displayName
        }).then(function(secondInvite) {
          assert.equal(secondInvite.status, 'UNUSED');

          // Have user one accept the INVITE
          return inviteService.acceptInvite(invite.code, fixture.troupe1.uri)
            .then(function(result) {

              var newUser = result.user;
              assert(!result.alreadyUsed, 'Invite has not already been used');
              assert.equal(newUser.status, 'PROFILE_NOT_COMPLETED');
              assert.equal(newUser.displayName, undefined);
              assert.equal(newUser.email, email);

              return troupeService.findById(fixture.troupe1.id)
                .then(function(troupe1Reloaded) {
                  assert(troupe1Reloaded.containsUserId(newUser.id) ,'New user should have access to troupe');

                  // Now we should also check that the invites that we UNCONFIRMED have been sent out
                  // and are now set to UNUSED
                  return persistence.Invite.findByIdQ(secondInvite)
                    .then(function(secondInviteReloaded) {
                      assert.equal(secondInviteReloaded.status, 'UNUSED');
                      assert.equal(secondInviteReloaded.userId, newUser.id);
                    });
                });

            });
        });


      })
      .nodeify(done);
    });

    var fixture2 = {};

    it('should handle acceptInvite being called more than once, provided the user has not yet got a password', function(done) {
      var inviteService = testRequire("./services/invite-service");
      var invite = fixture2.invite1;

      return inviteService.acceptInvite(invite.code, fixture.troupe1.uri)
        .then(function(result) {
          assert(result);
          assert(result.user);
          assert.equal(result.user.email, fixture2.invite1.email);

          return inviteService.acceptInvite(invite.code, fixture.troupe1.uri)
            .then(function(result) {
              assert(result);
              assert(result.user);
              assert.equal(result.user.email, fixture2.invite1.email);
            });
        })
        .nodeify(done);
    });

    it('should handle acceptInvite being called more than once but the user has completed their profile', function(done) {
      var inviteService = testRequire("./services/invite-service");
      var userService = testRequire("./services/user-service");
      var invite = fixture2.invite2;
      var confirmationCode = invite.code;

      return inviteService.acceptInvite(confirmationCode, fixture.troupe1.uri)
        .then(function(result) {
          assert(result);
          assert(result.user);
          assert.equal(result.user.email, invite.email);

          return userService.updateProfile({
            userId: result.user.id,
            displayName: fixture2.generateName(),
            password: '123456'
          });
        })
        .then(function() {
          return inviteService.acceptInvite(confirmationCode, fixture.troupe1.uri);
        })
        .then(function(result) {
          assert(result);
          assert.equal(result.user, null);
          assert(result.alreadyUsed);
        })
        .nodeify(done);
    });

    it('should handle acceptInvite being called with an invalid confirmation code', function(done) {
      var inviteService = testRequire("./services/invite-service");

      return inviteService.acceptInvite('187623871263128736128736128736123876123876', fixture.troupe1.uri)
        .then(function(result) {
          assert(result);
          assert.equal(result.user, null);
        })
        .nodeify(done);
    });



    before(fixtureLoader(fixture2, {
      user1: { },
      user2: { },
      troupe1: { users: [ 'user1' ]},
      invite1: { fromUser: 'user1', email: true, code: true },
      invite2: { fromUser: 'user1', email: true, code: true }
    }));

    after(function() {
      fixture2.cleanup();
    });

  });

  describe('#rejectInviteForAuthenticatedUser', function() {
    it('should delete and invite without changing the troupe', function(done) {
      var nonExistingEmail = 'testuser' + Date.now() + '@troupetest.local';
      testInviteRejection(nonExistingEmail, done);
    });
  });

  describe('#sendPendingInviteMails', function() {
    var fixture2 = {};
    function fakePresenceService(everyoneIsOnline) {
      return {
        categorizeUsersByOnlineStatus: function(userIds, callback) {
            var map = {};
            for (var a = 0; a < userIds.length; a++)
              map[userIds[a]] = everyoneIsOnline;
            callback(null, map);
          }
        };
    }

    it('should send mails for all new invites that were created more than 10 minutes ago, and have not been emailed yet.', function(done) {
      var emailNotificationServiceMock = mockito.spy(testRequire('./services/email-notification-service'));
      var inviteService = testRequire.withProxies("./services/invite-service", {
        './email-notification-service': emailNotificationServiceMock,
        './presence-service': fakePresenceService(true)
      });

      return inviteService.createInvite(null, { fromUser: fixture2.user1, userId: fixture2.user2.id })
        .then(function(invite) {
          return persistence.Invite.findByIdQ(invite.id)
            .then(function(invite) {
              assert(!invite.emailSentAt, "The emailSentAt property should be null");
              mockito.verifyZeroInteractions(emailNotificationServiceMock);


              return inviteService.sendPendingInviteMails(0)
                .then(function(count) {
                  assert(count >= 1, 'Send pending invite emails returned ' + count);
                });
            });
        })
      .nodeify(done);
    });

    it('should send mails for all new invites when users are offline', function(done) {
      var emailNotificationServiceMock = mockito.spy(testRequire('./services/email-notification-service'));
      var inviteService = testRequire.withProxies("./services/invite-service", {
        './email-notification-service': emailNotificationServiceMock,
        './presence-service': fakePresenceService(false)
      });

      return inviteService.createInvite(null, { fromUser: fixture2.user1, userId: fixture2.user2.id })
        .then(function(invite) {
          return persistence.Invite.findByIdQ(invite.id)
            .then(function(invite) {
              assert(invite.emailSentAt, "The emailSentAt property should not be null");
              mockito.verify(emailNotificationServiceMock, once);
            });
        })
      .nodeify(done);
    });


    it('should always send emails for externalInvites.', function(done) {
      var emailNotificationServiceMock = mockito.spy(testRequire('./services/email-notification-service'));
      var inviteService = testRequire.withProxies("./services/invite-service", {
        './email-notification-service': emailNotificationServiceMock,
        './presence-service': fakePresenceService(true)
      });

      return inviteService.createInvite(null, { fromUser: fixture2.user1, email: fixture2.generateEmail() })
        .then(function(invite) {
          return persistence.Invite.findByIdQ(invite.id)
            .then(function(invite) {
              assert(invite.emailSentAt, "The emailSentAt property should be set");
              mockito.verify(emailNotificationServiceMock, once);
            });
        })
      .nodeify(done);
    });


    before(fixtureLoader(fixture2, {
      user1: { },
      user2: { },
      user3: { },
      invite1: { fromUser: 'user1', user: 'user2' },
      invite2: { fromUser: 'user1', email: true }
    }));

    after(function() {
      fixture2.cleanup();
    });
  });

  describe('#findInviteForUserById', function() {
    var fixture2 = {};

    it('should find invites for users by id, when the user is the inviter', function(done) {
      var inviteService = testRequire("./services/invite-service");
      return inviteService.findInviteForUserById(fixture2.user1.id, fixture2.invite1.id)
        .then(function(invite) {
          assert(invite);
          assert.equal(invite.id, fixture2.invite1.id);
        })
        .nodeify(done);
    });

    it('should find invites for users by id, when the user is the invitee', function(done) {
      var inviteService = testRequire("./services/invite-service");
      return inviteService.findInviteForUserById(fixture2.user2.id, fixture2.invite1.id)
        .then(function(invite) {
          assert(invite);
          assert.equal(invite.id, fixture2.invite1.id);
        })
        .nodeify(done);
    });


    it('should not find invites for users by id, when the user is neither', function(done) {
      var inviteService = testRequire("./services/invite-service");
      return inviteService.findInviteForUserById(fixture2.user3.id, fixture2.invite1.id)
        .then(function(invite) {
          assert(!invite);
        })
        .nodeify(done);
    });

    before(fixtureLoader(fixture2, {
      user1: { },
      user2: { },
      user3: { },
      troupe1: { users: [ 'user1' ]},
      invite1: { fromUser: 'user1', troupe: 'troupe1', user: 'user2' }
    }));

    after(function() {
      fixture2.cleanup();
    });

  });

  describe('#findInviteForTroupeById', function() {
    var fixture2 = {};

    it('should find invites for troupes by id', function(done) {
      var inviteService = testRequire("./services/invite-service");
      return inviteService.findInviteForTroupeById(fixture2.troupe1.id, fixture2.invite1.id)
        .then(function(invite) {
          assert(invite);
          assert.equal(invite.id, fixture2.invite1.id);
        })
        .nodeify(done);
    });

    it('should not find invites for other troupes', function(done) {
      var inviteService = testRequire("./services/invite-service");
      return inviteService.findInviteForTroupeById(fixture2.troupe2.id, fixture2.invite1.id)
        .then(function(invite) {
          assert(!invite);
        })
        .nodeify(done);
    });

    before(fixtureLoader(fixture2, {
      user1: { },
      user2: { },
      troupe1: { users: [ 'user1' ]},
      troupe2: { users: [ 'user1' ]},
      invite1: { fromUser: 'user1', troupe: 'troupe1', user: 'user2' }
    }));

    after(function() {
      fixture2.cleanup();
    });

  });

  describe('#markInviteUsedAndDeleteAllSimilarOutstandingInvites', function() {
    var fixture2 = {};

    it('should handle external connection invites', function(done) {
      var inviteService = testRequire("./services/invite-service");
      return inviteService.testOnly.markInviteUsedAndDeleteAllSimilarOutstandingInvites(fixture2.invite1a)
        .then(function(updateCount) {
          assert.strictEqual(updateCount, 1);
        })
        .nodeify(done);
    });

    it('should handle internal connection invites', function(done) {
      var inviteService = testRequire("./services/invite-service");
      return inviteService.testOnly.markInviteUsedAndDeleteAllSimilarOutstandingInvites(fixture2.invite2a)
        .then(function(updateCount) {
          assert.strictEqual(updateCount, 1);
        })
        .nodeify(done);
    });

    it('should handle internal troupe invites', function(done) {
      var inviteService = testRequire("./services/invite-service");
      return inviteService.testOnly.markInviteUsedAndDeleteAllSimilarOutstandingInvites(fixture2.invite3a)
        .then(function(updateCount) {
          assert.strictEqual(updateCount, 1);
        })
        .nodeify(done);
    });


    it('should handle external troupe invites', function(done) {
      var inviteService = testRequire("./services/invite-service");
      return inviteService.testOnly.markInviteUsedAndDeleteAllSimilarOutstandingInvites(fixture2.invite4a)
        .then(function(updateCount) {
          assert.strictEqual(updateCount, 1);
        })
        .nodeify(done);
    });


    it('should handle the normal case ', function(done) {
      var inviteService = testRequire("./services/invite-service");
      return inviteService.testOnly.markInviteUsedAndDeleteAllSimilarOutstandingInvites(fixture2.invite5)
        .then(function(updateCount) {
          assert.strictEqual(updateCount, 0);
        })
        .nodeify(done);
    });

    var email = fixtureLoader.generateEmail();
    before(fixtureLoader(fixture2, {
      user1: { },
      user2: { },
      user3: { },

      troupe1: { },

      invite1a: { fromUser: 'user1', email: email },
      invite1b: { fromUser: 'user1', email: email },

      invite2a: { fromUser: 'user1', user: 'user2' },
      invite2b: { fromUser: 'user1', user: 'user2' },

      invite3a: { fromUser: 'user1', user: 'user2', troupe: 'troupe1' },
      invite3b: { fromUser: 'user1', user: 'user2', troupe: 'troupe1' },

      invite4a: { fromUser: 'user1', email: email , troupe: 'troupe1' },
      invite4b: { fromUser: 'user2', email: email , troupe: 'troupe1' },

      invite5: { fromUser: 'user1', user: 'user3' }

    }));

    after(function() {
      fixture2.cleanup();
    });

  });

  before(fixtureLoader(fixture));

});
