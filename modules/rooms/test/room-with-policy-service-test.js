'use strict';

var proxyquireNoCallThru = require('proxyquire').noCallThru();
var assert = require('assert');
const sinon = require('sinon');
const mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var Promise = require('bluebird');
var StatusError = require('statuserror');
var persistence = require('gitter-web-persistence');
var RoomWithPolicyService = require('../lib/room-with-policy-service');
const roomService = require('../lib/room-service');
const troupeService = require('gitter-web-rooms/lib/troupe-service');
const policyFactory = require('gitter-web-permissions/lib/policy-factory');

describe('room-with-policy-service', function() {
  var fixture = fixtureLoader.setup({
    user1: {},
    userStaff: {
      staff: true
    },
    troupe1: {
      users: ['user1']
    },
    troupeWithReservedTags: {
      tags: ['foo:bar', 'foo']
    },
    troupeBan: {
      security: 'PUBLIC',
      githubType: 'REPO',
      users: ['userBan', 'userBanAdmin']
    },
    troupeBan2: {
      security: 'PUBLIC',
      githubType: 'REPO',
      users: ['userBan', 'userBanAdmin']
    },
    userBan: {},
    userBanAdmin: {},
    troupeForDeletion: {}
  });

  var isAdminPolicy = {
    canAdmin: function() {
      return Promise.resolve(true);
    },
    canJoin: function() {
      return Promise.resolve(true);
    }
  };

  var notAdminPolicy = {
    canAdmin: function() {
      return Promise.resolve(false);
    }
  };

  const canWritePolicy = {
    canWrite: async () => {
      return true;
    }
  };

  describe('updateTags #slow', function() {
    it('should update tags', function() {
      var rawTags = 'js, open source,    looooooooooooooooooooooooooooongtag,,,,';
      var cleanTags = ['js', 'open source', 'looooooooooooooooooo'];
      var r = new RoomWithPolicyService(fixture.troupe1, fixture.user1, isAdminPolicy);
      return r.updateTags(rawTags).then(function(troupe) {
        assert.deepEqual(troupe.tags.toObject(), cleanTags);
      });
    });

    it('should not save reserved-word tags(colons) with normal-user', function() {
      var rawTags = 'hey, foo:bar, there';
      var cleanTags = ['hey', 'there'];

      var r = new RoomWithPolicyService(fixture.troupe1, fixture.user1, isAdminPolicy);
      return r.updateTags(rawTags).then(function(troupe) {
        assert.deepEqual(troupe.tags.toObject(), cleanTags);
      });
    });

    it('should deny a non-admin', function() {
      var rawTags = 'hey, foo:bar, there';

      var r = new RoomWithPolicyService(fixture.troupe1, fixture.user1, notAdminPolicy);
      return r
        .updateTags(rawTags)
        .then(function() {
          assert.ok(false);
        })
        .catch(StatusError, function(err) {
          assert.strictEqual(err.status, 403);
        });
    });

    it('should save reserved-word tags with staff-user', function() {
      var rawTags = 'hey, foo:bar, there';
      var cleanTags = ['hey', 'foo:bar', 'there'];

      var r = new RoomWithPolicyService(fixture.troupe1, fixture.userStaff, notAdminPolicy);
      return r.updateTags(rawTags).then(function(troupe) {
        assert.deepEqual(troupe.tags.toObject(), cleanTags);
      });
    });

    it('should retain reserved-word tags with normal-user', function() {
      var fixtureTags = 'foo:bar, foo';
      var userTags = 'hey, there';
      var userActualTags = ['hey', 'there', 'foo:bar'];

      var r1 = new RoomWithPolicyService(
        fixture.troupeWithReservedTags,
        fixture.userStaff,
        notAdminPolicy
      );
      var r2 = new RoomWithPolicyService(
        fixture.troupeWithReservedTags,
        fixture.user1,
        isAdminPolicy
      );

      return r1
        .updateTags(fixtureTags)
        .then(function() {
          return r2.updateTags(userTags);
        })
        .then(function(troupe) {
          assert.deepEqual(troupe.tags.toObject(), userActualTags);
        });
    });
  });

  describe('bans #slow', function() {
    it('should ban users from rooms #slow', function() {
      var roomMembershipService = require('../lib/room-membership-service');

      var r = new RoomWithPolicyService(fixture.troupeBan, fixture.userBanAdmin, isAdminPolicy);

      return roomService
        .findBanByUsername(fixture.troupeBan._id, fixture.userBan.username)
        .then(function(banned) {
          assert(!banned);

          return r
            .banUserFromRoom(fixture.userBan.username, {})
            .then(function(ban) {
              assert.equal(ban.userId, fixture.userBan.id);
              assert.equal(ban.bannedBy, fixture.userBanAdmin.id);
              assert(ban.dateBanned);

              return roomMembershipService.checkRoomMembership(
                fixture.troupeBan._id,
                fixture.userBan.id
              );
            })
            .then(function(bannedUserIsInRoom) {
              assert(!bannedUserIsInRoom);

              return roomService.findBanByUsername(fixture.troupeBan.id, fixture.userBan.username);
            })
            .then(function(ban) {
              assert(ban);
              assert(ban.userId);

              return roomService
                .findBanByUsername(fixture.troupeBan._id, fixture.userBan.username)
                .then(function(banned) {
                  assert(banned);

                  return r.unbanUserFromRoom(ban.userId).then(function() {
                    return roomService
                      .findBanByUsername(fixture.troupeBan._id, fixture.userBan.username)
                      .then(function(banned) {
                        assert(!banned);

                        return roomService.findBanByUsername(
                          fixture.troupeBan.id,
                          fixture.userBan.username
                        );
                      })
                      .then(function(ban) {
                        assert(!ban);
                      });
                  });
                });
            });
        });
    });

    it('should not allow admins to be banned', function() {
      var RoomWithPolicyService = proxyquireNoCallThru('../lib/room-with-policy-service', {
        'gitter-web-permissions/lib/policy-factory': {
          createPolicyForRoom: function(user, room) {
            assert.strictEqual(user.id, fixture.userBan.id);
            assert.strictEqual(room.id, fixture.troupeBan2.id);
            return Promise.resolve({
              canAdmin: function() {
                return Promise.resolve(true);
              }
            });
          }
        }
      });

      var r = new RoomWithPolicyService(fixture.troupeBan2, fixture.userBanAdmin, isAdminPolicy);

      return r
        .banUserFromRoom(fixture.userBan.username, {})
        .then(function() {
          assert(false, 'Expected to fail as banned user is an admin');
        })
        .catch(StatusError, function(err) {
          assert.equal(err.status, 403);
        });
    });

    it('should not allow non-admins to ban', function() {
      var r = new RoomWithPolicyService(fixture.troupeBan2, fixture.userBanAdmin, notAdminPolicy);

      return r
        .banUserFromRoom(fixture.userBan.username, {})
        .then(function() {
          assert(false, 'Expected to fail');
        })
        .catch(StatusError, function(err) {
          assert.equal(err.status, 403);
        });
    });
  });

  describe('virtualUser bans #slow', () => {
    describe('banVirtualUserFromRoom', () => {
      const virtualUserBanfixtures = fixtureLoader.setup({
        user1: {},
        userBanAdmin: {},
        troupe1: {},
        troupeWithBannedVirtualUsers1: {
          bans: [
            {
              virtualUser: {
                type: 'matrix',
                externalId: 'banned-user:matrix.org'
              },
              dateBanned: new Date('1995-12-17T03:24:00+00:00'),
              bannedBy: 'userBanAdmin'
            }
          ]
        }
      });

      it('should not allow non-admins to ban', async () => {
        const roomWithPolicyService = new RoomWithPolicyService(
          virtualUserBanfixtures.troupe1,
          virtualUserBanfixtures.user1,
          notAdminPolicy
        );

        try {
          await roomWithPolicyService.banVirtualUserFromRoom({
            type: 'matrix',
            externalId: 'bad-guy:matrix.org'
          });
          assert(false, 'Expected to fail');
        } catch (err) {
          assert.equal(err.status, 403);
        }
      });

      it('bans virtualUser', async () => {
        const roomWithPolicyService = new RoomWithPolicyService(
          virtualUserBanfixtures.troupe1,
          virtualUserBanfixtures.userBanAdmin,
          isAdminPolicy
        );

        const ban = await roomWithPolicyService.banVirtualUserFromRoom({
          type: 'matrix',
          externalId: 'bad-guy:matrix.org'
        });

        assert.strictEqual(ban.userId, undefined);
        assert.strictEqual(ban.virtualUser.type, 'matrix');
        assert.strictEqual(ban.virtualUser.externalId, 'bad-guy:matrix.org');
        assert.strictEqual(
          mongoUtils.objectIDsEqual(ban.bannedBy, virtualUserBanfixtures.userBanAdmin._id),
          true
        );
      });

      it('unable to ban virtualUser with invalid properties', async () => {
        const roomWithPolicyService = new RoomWithPolicyService(
          virtualUserBanfixtures.troupe1,
          virtualUserBanfixtures.userBanAdmin,
          isAdminPolicy
        );

        try {
          await roomWithPolicyService.banVirtualUserFromRoom({
            type: 'matrix',
            // This is invalid because the max length is 255
            externalId: 'x'.repeat(1000)
          });
          assert(false, 'Expected to fail');
        } catch (err) {
          assert.equal(err.status, 400);
        }
      });

      it('returns existing ban', async () => {
        const roomWithPolicyService = new RoomWithPolicyService(
          virtualUserBanfixtures.troupeWithBannedVirtualUsers1,
          virtualUserBanfixtures.userBanAdmin,
          isAdminPolicy
        );

        const ban = await roomWithPolicyService.banVirtualUserFromRoom({
          type: 'matrix',
          externalId: 'banned-user:matrix.org'
        });

        assert.strictEqual(ban.dateBanned.toISOString(), '1995-12-17T03:24:00.000Z');
      });

      it('removes messages when option passed', async () => {
        const removeAllMessagesForVirtualUserInRoomIdStub = sinon.stub();
        const stubbedRoomWithPolicyService = proxyquireNoCallThru(
          '../lib/room-with-policy-service',
          {
            'gitter-web-chats': {
              removeAllMessagesForVirtualUserInRoomId: removeAllMessagesForVirtualUserInRoomIdStub
            }
          }
        );

        const roomWithPolicyService = new stubbedRoomWithPolicyService(
          virtualUserBanfixtures.troupe1,
          virtualUserBanfixtures.userBanAdmin,
          isAdminPolicy
        );

        await roomWithPolicyService.banVirtualUserFromRoom(
          {
            type: 'matrix',
            externalId: 'spammer:matrix.org'
          },
          {
            removeMessages: true
          }
        );

        assert(removeAllMessagesForVirtualUserInRoomIdStub.calledOnce);
      });
    });

    describe('unbanVirtualUserFromRoom', () => {
      const virtualUserBanfixtures = fixtureLoader.setup({
        user1: {},
        userBanAdmin: {},
        troupeWithBannedVirtualUsers1: {
          bans: [
            {
              virtualUser: {
                type: 'matrix',
                externalId: 'banned-user:matrix.org'
              },
              dateBanned: new Date('1995-12-17T03:24:00+00:00'),
              bannedBy: 'userBanAdmin'
            }
          ]
        }
      });

      it('should not allow non-admins to unban', async () => {
        const roomWithPolicyService = new RoomWithPolicyService(
          virtualUserBanfixtures.troupeWithBannedVirtualUsers1,
          virtualUserBanfixtures.user1,
          notAdminPolicy
        );

        try {
          await roomWithPolicyService.unbanVirtualUserFromRoom({
            type: 'matrix',
            externalId: 'banned-user:matrix.org'
          });
          assert(false, 'Expected to fail');
        } catch (err) {
          assert.equal(err.status, 403);
        }
      });

      it('unbans user', async () => {
        const roomWithPolicyService = new RoomWithPolicyService(
          virtualUserBanfixtures.troupeWithBannedVirtualUsers1,
          virtualUserBanfixtures.userBanAdmin,
          isAdminPolicy
        );

        await roomWithPolicyService.unbanVirtualUserFromRoom({
          type: 'matrix',
          externalId: 'banned-user:matrix.org'
        });

        const updatedRoom = await troupeService.findById(
          virtualUserBanfixtures.troupeWithBannedVirtualUsers1._id
        );
        assert.strictEqual(updatedRoom.bans.length, 0);
      });
    });
  });

  describe('meta', function() {
    it('should allow you to set a welcome message', async function() {
      const welcomeMessageText = 'this is a test';
      const r = new RoomWithPolicyService(fixture.troupe1, fixture.user1, isAdminPolicy);
      await r.updateRoomMeta({ welcomeMessage: welcomeMessageText });

      const { welcomeMessage } = await r.getMeta();
      assert(welcomeMessage.text);
      assert(welcomeMessage.html);
      assert.equal(welcomeMessage.text, welcomeMessageText);
    });

    it('should retrieve room metadata', async () => {
      const r = new RoomWithPolicyService(fixture.troupe1, fixture.user1, isAdminPolicy);
      await r.updateRoomMeta({ welcomeMessage: 'hello' });
      const result = await r.getMeta();
      assert.deepStrictEqual(result, {
        welcomeMessage: { text: 'hello', html: 'hello' }
      });
    });
  });

  describe('delete room', function() {
    it('should allow an admin to delete a room', function() {
      var r = new RoomWithPolicyService(fixture.troupeForDeletion, fixture.user1, isAdminPolicy);
      return r.deleteRoom().then(function() {
        return persistence.Troupe.findById(fixture.troupeForDeletion._id).then(function(troupe) {
          assert(!troupe);
        });
      });
    });

    it('should not allow a non-admin to delete a room', function() {
      var r = new RoomWithPolicyService(fixture.troupeForDeletion, fixture.user1, notAdminPolicy);
      return r.deleteRoom().catch(StatusError, function(err) {
        assert.equal(err.status, 403);
      });
    });
  });

  describe('sendMessage', () => {
    const banFixtures = fixtureLoader.setup({
      userAdmin1: {},
      userBridge1: {},
      userBanned1: {},
      troupeWithBannedUsers1: {
        bans: [
          {
            user: 'userBanned1',
            dateBanned: Date.now(),
            bannedBy: 'userAdmin1'
          }
        ]
      },
      troupeWithBannedVirtualUsers1: {
        bans: [
          {
            virtualUser: {
              type: 'matrix',
              externalId: 'banned-user:matrix.org'
            },
            dateBanned: Date.now(),
            bannedBy: 'userAdmin1'
          }
        ]
      }
    });

    it('normal user can send message', async () => {
      const roomWithPolicyService = new RoomWithPolicyService(
        fixture.troupe1,
        fixture.user1,
        canWritePolicy
      );

      const chatMessage = await roomWithPolicyService.sendMessage({ text: 'heya' });

      assert(chatMessage);
    });

    it('virtualUser can send message', async () => {
      const roomWithPolicyService = new RoomWithPolicyService(
        fixture.troupe1,
        fixture.user1,
        canWritePolicy
      );

      const chatMessage = await roomWithPolicyService.sendMessage({
        text: 'heya',
        virtualUser: {
          type: 'matrix',
          externalId: 'test-person:matrix.org',
          displayName: 'Tessa'
        }
      });

      assert(chatMessage);
      assert(chatMessage.virtualUser);
    });

    it('banned user can not send message', async () => {
      const policy = await policyFactory.createPolicyForRoomId(
        banFixtures.userBanned1,
        banFixtures.troupeWithBannedUsers1._id
      );

      const roomWithPolicyService = new RoomWithPolicyService(
        banFixtures.troupeWithBannedUsers1,
        banFixtures.userBanned1,
        policy
      );

      try {
        await roomWithPolicyService.sendMessage({
          text: 'heya'
        });
        assert(false, 'Expected to fail');
      } catch (err) {
        assert.equal(err.status, 403);
      }
    });

    it('banned virtualUser can not send message', async () => {
      const policy = await policyFactory.createPolicyForRoomId(
        banFixtures.userBanned1,
        banFixtures.troupeWithBannedVirtualUsers1._id
      );

      const roomWithPolicyService = new RoomWithPolicyService(
        banFixtures.troupeWithBannedVirtualUsers1,
        banFixtures.userBridge1,
        policy
      );

      try {
        await roomWithPolicyService.sendMessage({
          text: 'heya',
          virtualUser: {
            type: 'matrix',
            externalId: 'banned-user:matrix.org'
          }
        });
        assert(false, 'Expected to fail');
      } catch (err) {
        assert.equal(err.status, 403);
      }
    });
  });

  describe('editMessage', () => {
    const editFixtures = fixtureLoader.setup({
      user1: {},
      userAdmin1: {},
      userBridge1: {},
      userBanned1: {},
      troupe1: {},
      troupeWithBannedUsers1: {
        bans: [
          {
            user: 'userBanned1',
            dateBanned: Date.now(),
            bannedBy: 'userAdmin1'
          }
        ]
      },
      troupeWithBannedVirtualUsers1: {
        bans: [
          {
            virtualUser: {
              type: 'matrix',
              externalId: 'banned-user:matrix.org'
            },
            dateBanned: Date.now(),
            bannedBy: 'userAdmin1'
          }
        ]
      },
      message1: {
        user: 'user1',
        troupe: 'troupe1',
        text: 'my message'
      },
      messageFromVirtualUser1: {
        user: 'userBridge1',
        virtualUser: {
          type: 'matrix',
          externalId: 'test-person:matrix.org',
          displayName: 'Tessa'
        },
        troupe: 'troupe1',
        text: 'my message'
      },
      messageFromBannedUser1: {
        user: 'userBanned1',
        troupe: 'troupeWithBannedUsers1',
        text: 'my message'
      },
      messageFromBannedVirtualUser1: {
        user: 'userBridge1',
        virtualUser: {
          type: 'matrix',
          externalId: 'banned-user:matrix.org',
          displayName: 'bad-person'
        },
        troupe: 'troupeWithBannedVirtualUsers1',
        text: 'my message'
      }
    });

    it('normal user can edit message', async () => {
      const roomWithPolicyService = new RoomWithPolicyService(
        editFixtures.troupe1,
        editFixtures.user1,
        canWritePolicy
      );

      const chatMessage = await roomWithPolicyService.editMessage(editFixtures.message1, 'heya');

      assert(chatMessage);
      assert.strictEqual(chatMessage.text, 'heya');
    });

    it('admin user not allowed edit another users message', async () => {
      const roomWithPolicyService = new RoomWithPolicyService(
        editFixtures.troupe1,
        editFixtures.userAdmin1,
        canWritePolicy
      );

      try {
        await roomWithPolicyService.editMessage(editFixtures.message1, 'heya');
        assert(false, 'Expected to fail');
      } catch (err) {
        assert.equal(err.status, 403);
      }
    });

    it('virtualUser can edit message', async () => {
      const roomWithPolicyService = new RoomWithPolicyService(
        editFixtures.troupe1,
        editFixtures.userBridge1,
        canWritePolicy
      );

      const chatMessage = await roomWithPolicyService.editMessage(
        editFixtures.messageFromVirtualUser1,
        'aliens'
      );

      assert(chatMessage);
      assert(chatMessage.virtualUser);
      assert.strictEqual(chatMessage.text, 'aliens');
    });

    it('banned user can not edit message', async () => {
      const policy = await policyFactory.createPolicyForRoomId(
        editFixtures.userBanned1,
        editFixtures.troupeWithBannedUsers1._id
      );

      const roomWithPolicyService = new RoomWithPolicyService(
        editFixtures.troupeWithBannedUsers1,
        editFixtures.userBanned1,
        policy
      );

      try {
        await roomWithPolicyService.editMessage(editFixtures.messageFromBannedUser1, 'heya');
        assert(false, 'Expected to fail');
      } catch (err) {
        assert.equal(err.status, 403);
      }
    });

    it('banned virtualUser can not edit message', async () => {
      const policy = await policyFactory.createPolicyForRoomId(
        editFixtures.userBanned1,
        editFixtures.troupeWithBannedVirtualUsers1._id
      );

      const roomWithPolicyService = new RoomWithPolicyService(
        editFixtures.troupeWithBannedVirtualUsers1,
        editFixtures.userBridge1,
        policy
      );

      try {
        await roomWithPolicyService.editMessage(editFixtures.messageFromBannedVirtualUser1, 'heya');
        assert(false, 'Expected to fail');
      } catch (err) {
        assert.equal(err.status, 403);
      }
    });
  });

  describe('deleteMessageFromRoom', () => {
    const deleteFixtures = fixtureLoader.setup({
      user1: {},
      userAdmin1: {},
      troupe1: {},
      troupe2: {},
      message1: {
        user: 'user1',
        troupe: 'troupe1',
        text: 'my message'
      },
      message2: {
        user: 'user1',
        troupe: 'troupe1',
        text: 'my message'
      },
      messageInAnotherRoom1: {
        user: 'user1',
        troupe: 'troupe2',
        text: 'another rooms message'
      }
    });

    it('sender can delete message', async () => {
      const roomWithPolicyService = new RoomWithPolicyService(
        deleteFixtures.troupe1,
        deleteFixtures.user1,
        notAdminPolicy
      );

      await roomWithPolicyService.deleteMessageFromRoom(deleteFixtures.message1);

      assert(true);
    });

    it('admin can delete message', async () => {
      const roomWithPolicyService = new RoomWithPolicyService(
        deleteFixtures.troupe1,
        deleteFixtures.userAdmin1,
        isAdminPolicy
      );

      await roomWithPolicyService.deleteMessageFromRoom(deleteFixtures.message2);

      assert(true);
    });

    it('room admin can not delete message from another room', async () => {
      const roomWithPolicyService = new RoomWithPolicyService(
        deleteFixtures.troupe1,
        deleteFixtures.userAdmin1,
        isAdminPolicy
      );

      try {
        await roomWithPolicyService.deleteMessageFromRoom(deleteFixtures.messageInAnotherRoom1);
        assert(false, 'Expected to fail');
      } catch (err) {
        assert.equal(err.status, 404);
      }
    });
  });
});
