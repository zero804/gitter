/*jslint node:true, unused:true*/
/*global describe:true, it:true, before:true, after: true */
"use strict";

var testRequire = require('../test-require');
var assert = require('assert');
var fixtureLoader = require('../test-fixtures');
var Promise = require('bluebird');
var ObjectID = require('mongodb').ObjectID;
var fixture = {};

var mockito = require('jsmockito').JsMockito;
var times = mockito.Verifiers.times;
var once = times(1);

var persistence = testRequire("./services/persistence-service");
var mongoUtils = testRequire("./utils/mongo-utils");

describe('room-service', function() {
  before(fixtureLoader(fixture, {
    user1: { },
    user2: { },
    user3: { },
    troupeOrg1: {
      githubType: 'ORG',
      users: ['user1', 'user2']
    },
    troupeEmptyOrg: {
      githubType: 'ORG',
      users: []
    },
    troupeRepo: {
      security: 'PRIVATE',
      githubType: 'REPO',
      users: ['user1', 'user2']
    },
    troupeBan: {
      security: 'PUBLIC',
      githubType: 'REPO',
      users: ['userBan', 'userBanAdmin']
    },
    userBan: { },
    userBanAdmin: {},
    troupeCanRemove: {
      security: 'PUBLIC',
      githubType: 'REPO',
      users: ['userToRemove', 'userRemoveNonAdmin', 'userRemoveAdmin']
    },
    troupeCannotRemove: {
      security: 'PRIVATE',
      githubType: 'ONETOONE',
      users: ['userToRemove', 'userRemoveAdmin']
    },
    userToRemove: {},
    userRemoveNonAdmin: {},
    userRemoveAdmin: {}
  }));

  after(function() {
    fixture.cleanup();
  });

  describe('classic functionality #slow', function() {
    it('should fail to create a room for an org', function (done) {
      var permissionsModelMock = mockito.mockFunction();

      var roomService = testRequire.withProxies("./services/room-service", {
        './permissions-model': permissionsModelMock
      });

      mockito.when(permissionsModelMock)().then(function (user, right, uri, githubType) {
        assert.equal(user.username, fixture.user1.username);
        assert.equal(right, 'create');
        assert.equal(uri, 'gitterTest');
        assert.equal(githubType, 'ORG');

        return Promise.resolve(false);
      });

      return roomService.findOrCreateRoom(fixture.user1, 'gitterTest')
        .then(function () {
          assert(false, 'Expected an exception');
        }, function(err) {
          assert.strictEqual(err.status, 404);
        })
        .nodeify(done);
    });

    it('should deny access but provide public rooms #slow', function (done) {

      var permissionsModelMock = mockito.mockFunction();
      var uriResolver = mockito.mockFunction();

      var roomService = testRequire.withProxies('./services/room-service', {
        './uri-resolver': uriResolver,
        './permissions-model': permissionsModelMock
      });

      mockito
        .when(permissionsModelMock)()
        .then(function (user, right, uri, githubType) {
          assert.equal(user.username, fixture.user1.username);
          assert.equal(right, 'create');
          assert.equal(uri, 'gitterTest');
          assert.equal(githubType, 'ORG');

          return Promise.resolve(false);
        });

      mockito
        .when(uriResolver)()
        .then(function () {
          return Promise.resolve([null, {
              _id: '5436981c00062eebf0fbc0d5',
              githubType: 'ORG',
              uri: 'gitterTest',
              security: null,
              bans: [],
              oneToOne: false,
              status: 'ACTIVE',
              lcUri: 'gitterhq',
              tags: [],
              topic: 'Gitter',
          }, false]);
        });

      // test
      roomService
        .findOrCreateRoom(fixture.user1, 'gitterTest')
        .then(function () {
          assert(false, 'Expected an exception');
        }, function(err) {
          assert.strictEqual(err.status, 404);
          assert.strictEqual(err.githubType, 'ORG');
          assert.strictEqual(err.uri, 'gitterTest');
        })
        .nodeify(done);
    });


    it('should find or create a room for an organization', function(done) {
      var permissionsModelMock = mockito.mockFunction();

      var roomService = testRequire.withProxies("./services/room-service", {
        './permissions-model': permissionsModelMock
      });

      mockito
        .when(permissionsModelMock)().then(function (user, right, uri, githubType) {
        assert.equal(user.username, fixture.user1.username);
        assert.equal(right, 'create');
        assert.equal(uri, 'gitterTest');
        assert.equal(githubType, 'ORG');

        return Promise.resolve(true);
      });

      return roomService
        .findOrCreateRoom(fixture.user1, 'gitterTest')
        .then(function (uriContext) {
          assert(uriContext.didCreate);
          assert.equal(uriContext.troupe.uri, 'gitterTest');
          assert.equal(uriContext.troupe.userCount, 0);
        })
        .finally(function () {
          return persistence.Troupe.remove({ uri: 'gitterTest' }).exec();
        })
        .nodeify(done);
    });

    it('should find or create a room for a person', function(done) {
      var permissionsModelMock = mockito.mockFunction();
      var roomService = testRequire.withProxies("./services/room-service", {
        './permissions-model': permissionsModelMock
      });

      mockito.when(permissionsModelMock)().then(function(user, right, uri, githubType) {
        assert.equal(user.username, fixture.user1.username);
        assert.equal(right, 'view');
        assert.equal(uri, fixture.user2.username);
        assert.equal(githubType, 'ONETOONE');

        return Promise.resolve(true);
      });

      return roomService.findOrCreateRoom(fixture.user1, fixture.user2.username)
        .then(function(uriContext) {
          assert(uriContext.oneToOne);
          assert(uriContext.troupe);
          assert.equal(uriContext.otherUser.id, fixture.user2.id);
        })
        .nodeify(done);
    });

    it('should create a room for a repo', function(done) {
      var permissionsModelMock = mockito.mockFunction();
      var roomService = testRequire.withProxies("./services/room-service", {
        './permissions-model': permissionsModelMock
      });

      mockito.when(permissionsModelMock)().then(function(user, right, uri, githubType) {
        assert.equal(user.username, fixture.user1.username);
        assert.equal(right, 'create');
        assert.equal(uri, 'gitterHQ/cloaked-avenger');
        assert.equal(githubType, 'REPO');

        return Promise.resolve(true);
      });

      return roomService.findOrCreateRoom(fixture.user1, 'gitterHQ/cloaked-avenger')
        .nodeify(done);
    });

    it('should create a room for a repo ignoring the case', function(done) {
      return persistence.Troupe.findOneAndRemove({ lcUri: 'gitterhq/sandbox' })
        .exec()
        .then(function() {
          var permissionsModelMock = mockito.mockFunction();
          var roomService = testRequire.withProxies("./services/room-service", {
            './permissions-model': permissionsModelMock
          });

          mockito.when(permissionsModelMock)().then(function(user, right, uri, githubType) {
            assert.equal(user.username, fixture.user1.username);
            assert.equal(right, 'create');
            assert.equal(uri, 'gitterHQ/sandbox');
            assert.equal(githubType, 'REPO');

            return Promise.resolve(true);
          });
          return roomService.findOrCreateRoom(fixture.user1, 'gitterhq/sandbox', { ignoreCase: true })
            .then(function(uriContext) {

              assert(uriContext.troupe);
              assert(uriContext.troupe.lcUri  === 'gitterhq/sandbox');
              assert(uriContext.troupe.uri    === 'gitterHQ/sandbox');
            });
        })
        .nodeify(done);
    });

    it('should detect when a user hits their own userhome', function(done) {
        var roomService = testRequire("./services/room-service");

        return roomService.findOrCreateRoom(fixture.user1, fixture.user1.username)
          .then(function(context) {
            assert(context.ownUrl);
            assert(!context.oneToOne);
            assert(!context.troupe);
            assert(!context.didCreate);
            assert.strictEqual(context.uri, fixture.user1.username);
          })
          .nodeify(done);
    });

    it('should redirect a user when a URI is in the wrong case and the room is to be created', function(done) {
      return persistence.Troupe.findOneAndRemove({ lcUri: 'gitterhq/sandbox' })
        .exec()
        .then(function() {
          var permissionsModelMock = mockito.mockFunction();
          var roomService = testRequire.withProxies("./services/room-service", {
            './permissions-model': permissionsModelMock
          });

          mockito.when(permissionsModelMock)().then(function(user, right, uri, githubType) {
            assert.equal(user.username, fixture.user1.username);
            assert.equal(right, 'create');
            assert.equal(uri, 'gitterHQ/sandbox');
            assert.equal(githubType, 'REPO');

            return Promise.resolve(true);
          });

          return roomService.findOrCreateRoom(fixture.user1, 'gitterhq/sandbox')
            .then(function() {
              assert(false, 'Expected redirect');
            }, function(err) {
              assert.strictEqual(err.status, 301);
              assert.strictEqual(err.path, '/gitterHQ/sandbox');
            });
        })
        .nodeify(done);
    });

    it('should handle an invalid url correctly', function(done) {
      var roomService = testRequire("./services/room-service");

      return roomService.findOrCreateRoom(fixture.user1, 'joyent')
        .then(function () {
          assert(false, 'Expected exception');
        }, function(err) {
          assert.strictEqual(err.status, 404);
        })
        .nodeify(done);
    });

    it('should return an accessDenied if a user attempts to access an org which they dont have access to', function(done) {
      var roomPermissionsModelMock = mockito.mockFunction();

      var roomService = testRequire.withProxies("./services/room-service", {
        './room-permissions-model': roomPermissionsModelMock
      });

      mockito.when(roomPermissionsModelMock)().then(function(user, perm, incomingRoom) {
        assert.equal(perm, 'join');
        assert.equal(incomingRoom.id, fixture.troupeOrg1.id);
        return Promise.resolve(false);
      });

      return roomService.findOrCreateRoom(fixture.user3, fixture.troupeOrg1.uri)
        .then(function () {
          assert(false, 'Expected exception');
        }, function(err) {
          assert.strictEqual(err.status, 404);
          assert.strictEqual(err.githubType, 'ORG');
          assert.strictEqual(err.uri, fixture.troupeOrg1.uri);
        })
        .nodeify(done);
    });
  });

  describe('user revalidation', function() {
    it('should correctly revalidate the users in a room', function(done) {
      var roomPermissionsModelMock = mockito.mockFunction();
      var roomMembershipServiceMock = {
        findMembersForRoom: mockito.mockFunction(),
        removeRoomMembers:  mockito.mockFunction()
      };

      var roomService = testRequire.withProxies("./services/room-service", {
        './room-permissions-model': roomPermissionsModelMock,
        './room-membership-service': roomMembershipServiceMock
      });

      mockito.when(roomPermissionsModelMock)().then(function(user, perm, incomingRoom) {
        assert.equal(perm, 'join');
        assert.equal(incomingRoom.id, fixture.troupeRepo.id);

        if(user.id == fixture.user1.id) {
          return Promise.resolve(true);
        } else if(user.id == fixture.user2.id) {
          return Promise.resolve(false);
        } else {
          assert(false, 'Unknown user');
        }

      });

      mockito.when(roomMembershipServiceMock.findMembersForRoom)().then(function() {
        return Promise.resolve([fixture.user1._id, fixture.user2._id]);
      });

      mockito.when(roomMembershipServiceMock.removeRoomMembers)().then(function(troupeId, userIds) {
        assert.deepEqual(userIds, [fixture.user2._id]);
      });

      return roomService.revalidatePermissionsForUsers(fixture.troupeRepo)
        .then(function() {
          mockito.verify(roomMembershipServiceMock.findMembersForRoom, once)();
          mockito.verify(roomMembershipServiceMock.removeRoomMembers, once)();
        })
        .nodeify(done);

    });
  });

  describe('addUserToRoom', function() {
    var userId;
    beforeEach(function() {
      userId = mongoUtils.getNewObjectIdString();
    });

    function createRoomServiceWithStubs(stubs) {
      return testRequire.withProxies("./services/room-service", {
        './room-permissions-model': function() {
          return Promise.resolve(stubs.addUser);
        },
        './invited-permissions-service': function() {
          return Promise.resolve(stubs.canBeInvited);
        },
        './user-service': {
          createInvitedUser: function() {
            return Promise.resolve(stubs.createInvitedUserResult);
          },
          findByUsername: function() {
            return Promise.resolve(stubs.findByUsernameResult);
          }
        },
        './email-notification-service': {
          sendInvitation: stubs.onInviteEmail,
          addedToRoomNotification: function() {}
        },
        './email-address-service': function() {
          return Promise.resolve('a@b.com');
        }
      });
    }

    it('adds a user to the troupe', function(done) {
      var service = createRoomServiceWithStubs({
        addUser: true,
        findByUsernameResult: { username: 'test-user', id: userId, _id: userId },
        createInvitedUserResult: null,
        canBeInvited: true,
        onInviteEmail: function() {}
      });

      var _troupId = new ObjectID();
      var _userId = new ObjectID();

      var troupe = {
        _id: _troupId,
        id: _troupId.toString(),
        uri: 'user/room',
        save: function() {
          return Promise.resolve();
        }
      };

      var user = {
        _id: _userId,
        id: _userId.toString()
      };

      service.addUserToRoom(troupe, user, 'test-user')
        .nodeify(done);
    });

    it('saves troupe changes', function(done) {
      var service = createRoomServiceWithStubs({
        addUser: true,
        findByUsernameResult: { username: 'test-user', id: userId, _id: userId },
        createInvitedUserResult: null,
        canBeInvited: true,
        onInviteEmail: function() {}
      });

      var _troupId = new ObjectID();
      var _userId = new ObjectID();

      var troupe = {
        _id: _troupId,
        id: _troupId.toString(),
        uri: 'user/room',
        save: function() {
          return Promise.resolve();
        }
      };

      var user = {
        _id: _userId,
        id: _userId.toString()
      };

      service.addUserToRoom(troupe, user, 'test-user')
        .nodeify(done);
    });

    it('returns the added user and sets the date the user was added', function(done) {
      var service = createRoomServiceWithStubs({
        addUser: true,
        findByUsernameResult: { username: 'test-user', id: userId, _id: userId },
        createInvitedUserResult: null,
        canBeInvited: true,
        onInviteEmail: function() {}
      });

      var _troupId = new ObjectID();
      var _userId = new ObjectID();

      var troupe = {
        _id: _troupId,

        uri: 'user/room',
        save: function() {
          return Promise.resolve();
        }
      };

      var user = {
        _id: _userId,
        id: _userId.toString()
      };

      service.addUserToRoom(troupe, user, 'test-user')
        .then(function(user) {
          assert.equal(user.id, userId);
          assert.equal(user.username, 'test-user');

          return persistence.UserTroupeLastAccess.findOne({ userId: user.id }).exec();
        })
        .then(function(lastAccess) {
          assert(lastAccess);
          assert(lastAccess.added);
          assert(lastAccess.added[troupe.id]);
          assert(Date.now() - lastAccess.added[troupe.id] <= 30000);
        })
        .nodeify(done);
    });

    it('attempts an email invite for new users', function(done) {
      var service = createRoomServiceWithStubs({
        addUser: true,
        findByUsernameResult: null,
        createInvitedUserResult: {
          username: 'test-user',
          _id: userId,
          id: userId,
          state: 'INVITED',
          emails: ['a@b.com']
        },
        canBeInvited: true,
        onInviteEmail: function() {
          done();
        }
      });

      var _troupId = new ObjectID();
      var _userId = new ObjectID();

      var troupe = {
        _id: _troupId,
        uri: 'user/room',
        save: function() {
          return Promise.resolve();
        }
      };

      var user = {
        _id: _userId,
        id: _userId.toString()
      };
      service.addUserToRoom(troupe, user, 'test-user').catch(done);
    });

    it('fails with 403 when adding someone to who cant be invited', function(done) {
      var service = createRoomServiceWithStubs({
        addUser: true,
        findByUsernameResult: null,
        createInvitedUserResult: { username: 'test-user', id: 'test-user-id', state: 'INVITED' },
        canBeInvited: false,
        onInviteEmail: function() {}
      });

      var troupe = {
        uri: 'user/room',
        save: function() {}
      };

      service.addUserToRoom(troupe, {}, 'test-user').catch(function(err) {
        assert.equal(err.status, 403);
      }).nodeify(done);
    });

    it('fails with 409 when adding someone who is already in the room', function(done) {
      var _inviteeUserId = new ObjectID();

      var service = createRoomServiceWithStubs({
        addUser: true,
        findByUsernameResult: { username: 'test-user', id: _inviteeUserId, _id: _inviteeUserId },
        createInvitedUserResult: null,
        canBeInvited: true,
        onInviteEmail: function() {}
      });

      var _troupId = new ObjectID();
      var _userId = new ObjectID();

      var troupe = {
        _id: _troupId,
        uri: 'user/room',
        save: function() {}
      };

      var user = {
        _id: _userId,
        id: _userId.toString()
      };

      service.addUserToRoom(troupe, user, 'test-user').catch(function(err) {
        if (err.status !== 409) throw err;

      }).nodeify(done);
    });

    it('fails with 403 when instigating user doesnt have permission to add people', function(done) {
      var service = createRoomServiceWithStubs({
        addUser: false,
        findByUsernameResult: { username: 'test-user', id: 'test-user-id' },
        createInvitedUserResult: null,
        canBeInvited: true,
        onInviteEmail: function() {}
      });

      var troupe = {
        uri: 'user/room',
        save: function() {}
      };

      service.addUserToRoom(troupe, {}, 'test-user').catch(function(err) {
        if (err.status !== 403) throw err;
      }).nodeify(done);
    });

  });

  describe('custom rooms #slow', function() {

    describe('::org::', function() {

      it('should create private rooms and allow users to be added to them', function(done) {
        var permissionsModelMock = mockito.mockFunction();
        var roomService = testRequire.withProxies("./services/room-service", {
          './permissions-model': permissionsModelMock
        });

        mockito.when(permissionsModelMock)().then(function(user, perm, uri, githubType, security) {
          assert.equal(user.id, fixture.user1.id);
          assert.equal(perm, 'create');
          assert.equal(uri, fixture.troupeOrg1.uri + '/private');
          assert.equal(githubType, 'ORG_CHANNEL');
          assert.equal(security, 'PRIVATE');
          return Promise.resolve(true);
        });

        return roomService.createCustomChildRoom(fixture.troupeOrg1, fixture.user1, { name: 'private', security: 'PRIVATE' })
          .then(function(room) {
            mockito.verify(permissionsModelMock, once)();
            return room;
          })
          .then(function(room) {
            // Get another mock
            // ADD A PERSON TO THE ROOM
            var roomPermissionsModelMock = mockito.mockFunction();
            var roomService = testRequire.withProxies("./services/room-service", {
              './room-permissions-model': roomPermissionsModelMock
            });

            mockito.when(roomPermissionsModelMock)().then(function(user, perm, incomingRoom) {
              assert.equal(user.id, fixture.user1.id);
              assert.equal(perm, 'adduser');
              assert.equal(incomingRoom.id, room.id);
              return Promise.resolve(true);
            });

            return roomService.addUserToRoom(room, fixture.user1, fixture.user3.username)
              .then(function() {
                mockito.verify(permissionsModelMock, once)();
              })
              .thenReturn(room);
          })
          .then(function(room) {
            var roomMembershipService = testRequire('./services/room-membership-service');
            return roomMembershipService.checkRoomMembership(room.id, fixture.user3.id);
          })
          .then(function(isMember) {
            assert(isMember, 'Expected to find newly added user in the room');
          })
          .nodeify(done);
      });

      it('should create open rooms', function(done) {
        var permissionsModelMock = mockito.mockFunction();
        var roomService = testRequire.withProxies("./services/room-service", {
          './permissions-model': permissionsModelMock
        });

        mockito.when(permissionsModelMock)().then(function(user, perm, uri, githubType, security) {
          assert.equal(user.id, fixture.user1.id);
          assert.equal(perm, 'create');
          assert.equal(uri, fixture.troupeOrg1.uri + '/open');
          assert.equal(githubType, 'ORG_CHANNEL');
          assert.equal(security, 'PUBLIC');
          return Promise.resolve(true);
        });

        return roomService.createCustomChildRoom(fixture.troupeOrg1, fixture.user1, { name: 'open', security: 'PUBLIC' })
          .then(function(room) {
            mockito.verify(permissionsModelMock, once)();
            return room;
          })
          .then(function(room) {
            // Get another mock
            // ADD A PERSON TO THE ROOM
            var roomPermissionsModelMock = mockito.mockFunction();
            var roomService = testRequire.withProxies("./services/room-service", {
              './room-permissions-model': roomPermissionsModelMock
            });

            mockito.when(roomPermissionsModelMock)().then(function(user, perm, _room) {
              assert.equal(user.id, fixture.user1.id);
              assert.equal(perm, 'adduser');
              assert.equal(room.id, _room.id);
              return Promise.resolve(true);
            });

            return roomService.addUserToRoom(room, fixture.user1, fixture.user3.username)
              .then(function() {
                mockito.verify(roomPermissionsModelMock, once)();
              })
              .thenReturn(room);
          })
          .then(function(room) {
            var roomMembershipService = testRequire('./services/room-membership-service');
            return roomMembershipService.checkRoomMembership(room.id, fixture.user3.id);
          })
          .then(function(isMember) {
            assert(isMember, 'Expected to find newly added user in the room');
          })
          .nodeify(done);
      });

      it('should create inherited rooms', function(done) {
        var permissionsModelMock = mockito.mockFunction();
        var roomService = testRequire.withProxies("./services/room-service", {
          './permissions-model': permissionsModelMock
        });

        mockito.when(permissionsModelMock)().then(function(user, perm, uri, githubType, security) {
          assert.equal(user.id, fixture.user1.id);
          assert.equal(perm, 'create');
          assert.equal(uri, fixture.troupeOrg1.uri + '/child');
          assert.equal(githubType, 'ORG_CHANNEL');
          assert.equal(security, 'INHERITED');
          return Promise.resolve(true);
        });

        return roomService.createCustomChildRoom(fixture.troupeOrg1, fixture.user1, { name: 'child', security: 'INHERITED' })
          .then(function(room) {
            mockito.verify(permissionsModelMock, once)();
            return room;
          })
          .then(function(room) {
            // Get another mock
            // ADD A PERSON TO THE ROOM
            var roomPermissionsModelMock = mockito.mockFunction();
            var roomService = testRequire.withProxies("./services/room-service", {
              './room-permissions-model': roomPermissionsModelMock,
              './invited-permissions-service': function() { return Promise.resolve(true); }
            });

            mockito.when(roomPermissionsModelMock)().then(function(user, perm, _room) {
              assert.equal(user.id, fixture.user1.id);
              assert.equal(perm, 'adduser');
              assert.equal(room.id, _room.id);
              return Promise.resolve(true);
            });

            return roomService.addUserToRoom(room, fixture.user1, fixture.user3.username)
              .then(function() {
                mockito.verify(roomPermissionsModelMock, once)();
              })
              .thenReturn(room);
          })
          .then(function(room) {
            var roomMembershipService = testRequire('./services/room-membership-service');
            return roomMembershipService.checkRoomMembership(room.id, fixture.user3.id);
          })
          .then(function(isMember) {
            assert(isMember, 'Expected to find newly added user in the room');
          })
          .nodeify(done);
      });

      it('should create inherited rooms for empty orgs', function(done) {
        var permissionsModelMock = mockito.mockFunction();
        var roomService = testRequire.withProxies("./services/room-service", {
          './permissions-model': permissionsModelMock
        });

        mockito.when(permissionsModelMock)().then(function(user, perm, uri, githubType, security) {
          assert.equal(user.id, fixture.user1.id);
          assert.equal(perm, 'create');
          assert.equal(uri, fixture.troupeEmptyOrg.uri + '/child');
          assert.equal(githubType, 'ORG_CHANNEL');
          assert.equal(security, 'INHERITED');
          return Promise.resolve(true);
        });

        return roomService.createCustomChildRoom(fixture.troupeEmptyOrg, fixture.user1, { name: 'child', security: 'INHERITED' })
          .then(function(room) {
            mockito.verify(permissionsModelMock, once)();
            return room;
          })
          .then(function(room) {
            // Get another mock
            // ADD A PERSON TO THE ROOM
            var roomPermissionsModelMock = mockito.mockFunction();
            var roomService = testRequire.withProxies("./services/room-service", {
              './room-permissions-model': roomPermissionsModelMock,
              './invited-permissions-service': function() { return Promise.resolve(true); }
            });

            mockito.when(roomPermissionsModelMock)().then(function(user, perm, _room) {
              assert.equal(user.id, fixture.user1.id);
              assert.equal(perm, 'adduser');
              assert.equal(room.id, _room.id);
              return Promise.resolve(true);
            });

            return roomService.addUserToRoom(room, fixture.user1, fixture.user3.username)
              .then(function() {
                mockito.verify(roomPermissionsModelMock, once)();
              })
              .thenReturn(room);
          })
          .then(function(room) {
            var roomMembershipService = testRequire('./services/room-membership-service');
            return roomMembershipService.checkRoomMembership(room.id, fixture.user3.id);
          })
          .then(function(isMember) {
            assert(isMember, 'Expected to find newly added user in the room');
          })
          .nodeify(done);
      });

    });

    describe('::repo::', function() {
      it(/* ::repo */ 'should create private rooms', function(done) {
        var permissionsModelMock = mockito.mockFunction();
        var roomService = testRequire.withProxies("./services/room-service", {
          './permissions-model': permissionsModelMock
        });

        mockito.when(permissionsModelMock)().then(function(user, perm, uri, githubType, security) {
          assert.equal(user.id, fixture.user1.id);
          assert.equal(perm, 'create');
          assert.equal(uri, fixture.troupeRepo.uri + '/private');
          assert.equal(githubType, 'REPO_CHANNEL');
          assert.equal(security, 'PRIVATE');
          return Promise.resolve(true);
        });

        return roomService.createCustomChildRoom(fixture.troupeRepo, fixture.user1, { name: 'private', security: 'PRIVATE' })
          .then(function(room) {
            mockito.verify(permissionsModelMock, once)();
            return room;
          })
          .then(function(room) {
            // Get another mock
            // ADD A PERSON TO THE ROOM
            var roomPermissionsModelMock = mockito.mockFunction();
            var roomService = testRequire.withProxies("./services/room-service", {
              './room-permissions-model': roomPermissionsModelMock
            });

            mockito.when(roomPermissionsModelMock)().then(function(user, perm, _room) {
              assert.equal(user.id, fixture.user1.id);
              assert.equal(perm, 'adduser');
              assert.equal(_room.id, room.id);
              return Promise.resolve(true);
            });

            return roomService.addUserToRoom(room, fixture.user1, fixture.user3.username)
              .then(function() {
                mockito.verify(roomPermissionsModelMock, once)();
              })
              .thenReturn(room);
          })
          .then(function(room) {
            var roomMembershipService = testRequire('./services/room-membership-service');
            return roomMembershipService.checkRoomMembership(room.id, fixture.user3.id);
          })
          .then(function(isMember) {
            assert(isMember, 'Expected to find newly added user in the room');
          })
          .nodeify(done);
      });

      it(/* ::repo */ 'should create open rooms', function(done) {
        var permissionsModelMock = mockito.mockFunction();
        var roomService = testRequire.withProxies("./services/room-service", {
          './permissions-model': permissionsModelMock
        });


        mockito.when(permissionsModelMock)().then(function(user, perm, uri, githubType, security) {
          assert.equal(user.id, fixture.user1.id);
          assert.equal(perm, 'create');
          assert.equal(uri, fixture.troupeRepo.uri + '/open');
          assert.equal(githubType, 'REPO_CHANNEL');
          assert.equal(security, 'PUBLIC');
          return Promise.resolve(true);
        });

        return roomService.createCustomChildRoom(fixture.troupeRepo, fixture.user1, { name: 'open', security: 'PUBLIC' })
          .then(function(room) {
            mockito.verify(permissionsModelMock, once)();
            return room;
          })
          .then(function(room) {
            // Get another mock
            // ADD A PERSON TO THE ROOM
            var roomPermissionsModelMock = mockito.mockFunction();
            var roomService = testRequire.withProxies("./services/room-service", {
              './room-permissions-model': roomPermissionsModelMock
            });

            mockito.when(roomPermissionsModelMock)().then(function(user, perm, _room) {
              assert.equal(user.id, fixture.user1.id);
              assert.equal(perm, 'adduser');
              assert.equal(_room.id, room.id);
              return Promise.resolve(true);
            });

            return roomService.addUserToRoom(room, fixture.user1, fixture.user3.username)
              .then(function() {
                mockito.verify(roomPermissionsModelMock, once)();
              })
              .thenReturn(room);
          })
          .then(function(room) {
            var roomMembershipService = testRequire('./services/room-membership-service');
            return roomMembershipService.checkRoomMembership(room.id, fixture.user3.id);
          })
          .then(function(isMember) {
            assert(isMember, 'Expected to find newly added user in the room');
          })
          .nodeify(done);
      });

      it(/* ::repo */ 'should create inherited rooms', function(done) {
        var permissionsModelMock = mockito.mockFunction();
        var roomService = testRequire.withProxies("./services/room-service", {
          './permissions-model': permissionsModelMock
        });

        mockito.when(permissionsModelMock)().then(function(user, perm, uri, githubType, security) {
          assert.equal(user.id, fixture.user1.id);
          assert.equal(perm, 'create');
          assert.equal(uri, fixture.troupeRepo.uri + '/child');
          assert.equal(githubType, 'REPO_CHANNEL');
          assert.equal(security, 'INHERITED');
          return Promise.resolve(true);
        });

        return roomService.createCustomChildRoom(fixture.troupeRepo, fixture.user1, { name: 'child', security: 'INHERITED' })
          .then(function(room) {
            mockito.verify(permissionsModelMock, once)();
            return room;
          })
          .then(function(room) {
            // Get another mock
            // ADD A PERSON TO THE ROOM
            var roomPermissionsModelMock = mockito.mockFunction();
            var roomService = testRequire.withProxies("./services/room-service", {
              './room-permissions-model': roomPermissionsModelMock,
              './invited-permissions-service': function() { return Promise.resolve(true); }
            });

            mockito.when(roomPermissionsModelMock)().then(function(user, perm, _room) {
              assert.equal(user.id, fixture.user1.id);
              assert.equal(perm, 'adduser');
              assert.equal(_room.id, room.id);
              return Promise.resolve(true);
            });

            return roomService.addUserToRoom(room, fixture.user1, fixture.user3.username)
              .then(function() {
                mockito.verify(permissionsModelMock, once)();
              })
              .thenReturn(room);
          })
          .then(function(room) {
            var roomMembershipService = testRequire('./services/room-membership-service');
            return roomMembershipService.checkRoomMembership(room.id, fixture.user3.id);
          })
          .then(function(isMember) {
            assert(isMember, 'Expected to find newly added user in the room');
          })
          .nodeify(done);
      });

    });

    describe('::user::', function() {

      it('should create private rooms without a name', function(done) {
        var permissionsModelMock = mockito.mockFunction();
        var roomService = testRequire.withProxies("./services/room-service", {
          './permissions-model': permissionsModelMock
        });

        mockito.when(permissionsModelMock)().then(function(user, perm, uri, githubType, security) {
          assert.equal(user.id, fixture.user1.id);
          assert.equal(perm, 'create');
          assert.equal(githubType, 'USER_CHANNEL');
          assert.equal(security, 'PRIVATE');
          return Promise.resolve(true);
        });

        return roomService.createCustomChildRoom(null, fixture.user1, { security: 'PRIVATE' })
          .then(function(room) {
            mockito.verify(permissionsModelMock, once)();
            return room;
          })
          .then(function(room) {
            // Get another mock
            // ADD A PERSON TO THE ROOM
            var roomPermissionsModelMock = mockito.mockFunction();
            var roomService = testRequire.withProxies("./services/room-service", {
              './room-permissions-model': roomPermissionsModelMock
            });

            mockito.when(roomPermissionsModelMock)().then(function(user, perm, _room) {
              assert.equal(user.id, fixture.user1.id);
              assert.equal(perm, 'adduser');
              assert.equal(_room.id, room.id);
              return Promise.resolve(true);
            });

            return roomService.addUserToRoom(room, fixture.user1, fixture.user3.username)
              .then(function() {
                mockito.verify(roomPermissionsModelMock, once)();
              })
              .thenReturn(room);
          })
          .then(function(room) {
            var roomMembershipService = testRequire('./services/room-membership-service');
            return roomMembershipService.checkRoomMembership(room.id, fixture.user3.id);
          })
          .then(function(userIsInRoom) {
            assert(userIsInRoom, 'Expected to find newly added user in the room');
          })

          .nodeify(done);
      });

      it('should create private rooms with name', function(done) {
        var permissionsModelMock = mockito.mockFunction();
        var roomService = testRequire.withProxies("./services/room-service", {
          './permissions-model': permissionsModelMock
        });

        mockito.when(permissionsModelMock)().then(function(user, perm, uri, githubType, security) {
          assert.equal(user.id, fixture.user1.id);
          assert.equal(perm, 'create');
          assert.equal(uri, fixture.user1.username + '/private');
          assert.equal(githubType, 'USER_CHANNEL');
          assert.equal(security, 'PRIVATE');
          return Promise.resolve(true);
        });

        return roomService.createCustomChildRoom(null, fixture.user1, { name: 'private',  security: 'PRIVATE' })
          .then(function(room) {
            mockito.verify(permissionsModelMock, once)();
            return room;
          })
          .then(function(room) {
            // Get another mock
            // ADD A PERSON TO THE ROOM
            var roomPermissionsModelMock = mockito.mockFunction();
            var roomService = testRequire.withProxies("./services/room-service", {
              './room-permissions-model': roomPermissionsModelMock
            });

            mockito.when(roomPermissionsModelMock)().then(function(user, perm, _room) {
              assert.equal(user.id, fixture.user1.id);
              assert.equal(perm, 'adduser');
              assert.equal(_room.id, room.id);
              return Promise.resolve(true);
            });

            return roomService.addUserToRoom(room, fixture.user1, fixture.user3.username)
              .then(function() {
                mockito.verify(roomPermissionsModelMock, once)();
              })
              .thenReturn(room);
          })
          .then(function(room) {
            var roomMembershipService = testRequire('./services/room-membership-service');
            return roomMembershipService.checkRoomMembership(room.id, fixture.user3.id);
          })
          .then(function(isMember) {
            assert(isMember, 'Expected to find newly added user in the room');
          })
          .nodeify(done);
      });

      it('should create open rooms', function(done) {
        var permissionsModelMock = mockito.mockFunction();
        var roomService = testRequire.withProxies("./services/room-service", {
          './permissions-model': permissionsModelMock
        });

        mockito.when(permissionsModelMock)().then(function(user, perm, uri, githubType, security) {
          assert.equal(user.id, fixture.user1.id);
          assert.equal(perm, 'create');
          assert.equal(uri, fixture.user1.username + '/open');
          assert.equal(githubType, 'USER_CHANNEL');
          assert.equal(security, 'PUBLIC');
          return Promise.resolve(true);
        });

        return roomService.createCustomChildRoom(null, fixture.user1, { name: 'open', security: 'PUBLIC' })
          .then(function(room) {
            mockito.verify(permissionsModelMock, once)();
            return room;
          })
          .then(function(room) {
            // Get another mock
            // ADD A PERSON TO THE ROOM
            var roomPermissionsModelMock = mockito.mockFunction();
            var roomService = testRequire.withProxies("./services/room-service", {
              './room-permissions-model': roomPermissionsModelMock
            });

            mockito.when(roomPermissionsModelMock)().then(function(user, perm, _room) {
              assert.equal(user.id, fixture.user1.id);
              assert.equal(perm, 'adduser');
              assert.equal(_room.id, room.id);
              return Promise.resolve(true);
            });

            return roomService.addUserToRoom(room, fixture.user1, fixture.user3.username)
              .then(function() {
                mockito.verify(roomPermissionsModelMock, once)();
              })
              .thenReturn(room);
          })
          .then(function(room) {
            var roomMembershipService = testRequire('./services/room-membership-service');
            return roomMembershipService.checkRoomMembership(room.id, fixture.user3.id);
          })
          .then(function(userIsInRoom) {
            assert(userIsInRoom, 'Expected to find newly added user in the room');
          })

          .nodeify(done);
      });

      it('should NOT create child rooms', function(done) {
        var permissionsModelMock = mockito.mockFunction();
        var roomService = testRequire.withProxies("./services/room-service", {
          './permissions-model': permissionsModelMock
        });

        var fail = 0;
        return roomService.createCustomChildRoom(null, fixture.user1, { name: 'inherited', security: 'INHERITED' })
          .catch(function() {
            fail++;
          })
          .then(function() {
            assert.equal(fail, 1);
          })
          .nodeify(done);
      });



      it('should be able to delete rooms #slow', function(done) {
        var permissionsModelMock = mockito.mockFunction();
        var troupeService = testRequire('./services/troupe-service');
        var roomService = testRequire.withProxies('./services/room-service', {
          './permissions-model': permissionsModelMock
        });

        mockito.when(permissionsModelMock)().then(function(user, perm, uri, githubType, security) {
          assert.equal(user.id, fixture.user1.id);
          assert.equal(perm, 'create');
          assert.equal(uri, fixture.user1.username + '/tobedeleted');
          assert.equal(githubType, 'USER_CHANNEL');
          assert.equal(security, 'PUBLIC');
          return Promise.resolve(true);
        });

        return roomService.createCustomChildRoom(null, fixture.user1, { name: 'tobedeleted', security: 'PUBLIC' })
          .then(function(room) {
            mockito.verify(permissionsModelMock, once)();
            return room;
          })
          .then(function(room) {
            return roomService.deleteRoom(room).thenReturn(room.lcUri);
          })
          .then(function(roomUri) {
            return troupeService.findByUri(roomUri);
          })
          .then(function(room) {
            assert(room === null, 'Expected room to be null after deletion');
          })
          .nodeify(done);
      });

    });

  });

  describe('bans', function() {
    it('should ban users from rooms #slow', function(done) {
      var roomPermissionsModelMock = mockito.mockFunction();

      var roomService = testRequire.withProxies("./services/room-service", {
        './room-permissions-model': roomPermissionsModelMock
      });
      var roomMembershipService = testRequire('./services/room-membership-service');
      var userBannedFromRoom = testRequire('./services/user-banned-from-room');

      mockito.when(roomPermissionsModelMock)().then(function(user, perm, incomingRoom) {
        assert.equal(perm, 'admin');
        assert.equal(incomingRoom.id, fixture.troupeBan.id);

        if(user.id == fixture.userBan.id) {
          return Promise.resolve(false);
        } else if(user.id == fixture.userBanAdmin.id) {
          return Promise.resolve(true);
        } else {
          assert(false, 'Unknown user');
        }
      });

      return userBannedFromRoom(fixture.troupeBan.uri, fixture.userBan)
        .then(function(banned) {
          assert(!banned);

          return roomService.banUserFromRoom(fixture.troupeBan, fixture.userBan.username, fixture.userBanAdmin, {})
            .then(function(ban) {
              assert.equal(ban.userId, fixture.userBan.id);
              assert.equal(ban.bannedBy, fixture.userBanAdmin.id);
              assert(ban.dateBanned);

              return roomMembershipService.checkRoomMembership(fixture.troupeBan._id, fixture.userBan.id);
            })
            .then(function(bannedUserIsInRoom) {
              assert(!bannedUserIsInRoom);

              return roomService.findBanByUsername(fixture.troupeBan.id, fixture.userBan.username);
            })
            .then(function(banAndUser) {
              assert(banAndUser);
              assert(banAndUser.user);
              assert(banAndUser.ban);

              return userBannedFromRoom(fixture.troupeBan.uri, fixture.userBan)
                .then(function(banned) {
                  assert(banned);

                  return roomService.unbanUserFromRoom(fixture.troupeBan, banAndUser.ban, fixture.userBan.username, fixture.userBanAdmin)
                    .then(function() {
                      return userBannedFromRoom(fixture.troupeBan.uri, fixture.userBan)
                        .then(function(banned) {
                          assert(!banned);

                          return roomService.findBanByUsername(fixture.troupeBan.id, fixture.userBan.username);
                        })
                        .then(function(banAndUser) {
                          assert(!banAndUser);
                        });
                    });
                });
            });
        })
        .nodeify(done);

    });

    it('should not allow admins to be banned', function(done) {
      var roomPermissionsModelMock = mockito.mockFunction();

      var roomService = testRequire.withProxies("./services/room-service", {
        './room-permissions-model': roomPermissionsModelMock
      });

      mockito.when(roomPermissionsModelMock)().then(function(user, perm, incomingRoom) {
        assert.equal(perm, 'admin');
        assert.equal(incomingRoom.id, fixture.troupeBan.id);

        if(user.id == fixture.userBan.id) {
          return Promise.resolve(true);
        } else if(user.id == fixture.userBanAdmin.id) {
          return Promise.resolve(true);
        } else {
          assert(false, 'Unknown user');
        }
      });


      return roomService.banUserFromRoom(fixture.troupeBan, fixture.userBan.username, fixture.userBanAdmin, {})
        .then(function() {
          assert(false, 'Expected to fail as user is not an admin');
        })
        .catch(function(err) {
          assert.equal(err.status, 400);
        })
        .nodeify(done);

    });

  });

  describe('removals', function() {

    var roomPermissionsModelMock = mockito.mockFunction();
    var roomService = testRequire.withProxies('./services/room-service', {
      './room-permissions-model': roomPermissionsModelMock
    });
    var userIsInRoom = testRequire('./services/user-in-room');

    mockito.when(roomPermissionsModelMock)().then(function(user, perm) {
      assert.equal(perm, 'admin');

      if(user.id == fixture.userRemoveNonAdmin.id) {
        return Promise.resolve(false);
      } else if(user.id == fixture.userRemoveAdmin.id) {
        return Promise.resolve(true);
      } else {
        assert(false, 'Unknown user');
      }
    });

    it('should prevent non-admin from removing users from rooms', function(done) {
      return userIsInRoom(fixture.troupeCanRemove.uri, fixture.userToRemove)
        .then(function(here) {
          assert(here);
          return roomService.removeUserFromRoom(fixture.troupeCanRemove, fixture.userToRemove, fixture.userRemoveNonAdmin);
        })
        .catch(function(err) {
          assert.equal(err.status, 403);
        })
        .then(function() {
          return userIsInRoom(fixture.troupeCanRemove.uri, fixture.userToRemove);
        })
        .then(function(here) {
          assert(here);
        })
        .done(done);
    });

    it('should prevent from removing users from one-to-one rooms', function(done) {
      return userIsInRoom(fixture.troupeCannotRemove.uri, fixture.userToRemove)
        .then(function(here) {
          assert(here);
          return roomService.removeUserFromRoom(fixture.troupeCannotRemove, fixture.userToRemove, fixture.userRemoveAdmin);
        })
        .catch(function(err) {
          assert.equal(err.status, 400);
          assert.equal(err.message, 'This room does not support removing.');
        })
        .then(function() {
          return userIsInRoom(fixture.troupeCannotRemove.uri, fixture.userToRemove);
        })
        .then(function(here) {
          assert(here);
        })
        .done(done);
    });

    it('should remove users from rooms', function(done) {
      return userIsInRoom(fixture.troupeCanRemove.uri, fixture.userToRemove)
        .then(function(here) {
          assert(here);
          return roomService.removeUserFromRoom(fixture.troupeCanRemove, fixture.userToRemove, fixture.userRemoveAdmin);
        })
        .then(function() {
          return userIsInRoom(fixture.troupeCanRemove.uri, fixture.userToRemove);
        })
        .then(function(here) {
          assert(!here);
        })
        .done(done);
    });

  });

  describe('remove and hide #slow', function() {
    var troupeService = testRequire('./services/troupe-service');
    var recentRoomService = testRequire('./services/recent-room-service');
    var userIsInRoom = testRequire('./services/user-in-room');
    var recentRoomCore = testRequire('./services/core/recent-room-core');
    var appEvents = testRequire('gitter-web-appevents');

    describe('room-service #slow', function() {

      beforeEach(fixtureLoader(fixture, {
        troupeCanRemove: {
          security: 'PUBLIC',
          githubType: 'REPO',
          users: ['userFavourite', 'userLeave', 'userToRemove', 'userRemoveNonAdmin', 'userRemoveAdmin']
        },
        troupeCannotRemove: {
          security: 'PRIVATE',
          githubType: 'ONETOONE',
          users: ['userToRemove', 'userRemoveAdmin']
        },
        troupeEmpty: {
          security: 'PUBLIC',
          githubType: 'REPO',
          users: []
        },
        userFavourite: {},
        userLeave: {},
        userToRemove: {},
        userRemoveNonAdmin: {},
        userRemoveAdmin: {}
      }));

      afterEach(function() {
        fixture.cleanup();
      });

      describe('#removeFavourite', function() {

        var roomService = testRequire('./services/room-service');

        var getFavs = function() {
          return recentRoomCore.findFavouriteTroupesForUser(fixture.userFavourite.id);
        };

        var createFav = function() {
          return recentRoomService.updateFavourite(fixture.userFavourite.id, fixture.troupeCanRemove.id, true)
          .then(getFavs)
          .then(function(favs) {
            assert(favs[fixture.troupeCanRemove.id]); // Favourite is created
          });
        };

        var checkHere = function() {
          return userIsInRoom(fixture.troupeCanRemove.uri, fixture.userFavourite);
        };

        // Create an event listener with expected parameters
        // If the test keeps pending, it means no event is emitted with these parameters
        var addListenner = function(expected) {

          var promise = new Promise(function(resolve) {
            appEvents.onDataChange2(function(res) {
              // First filter by url and operation, as other events may have been emitted
              if (expected.url && expected.url !== res.url) return;
              if (expected.operation && expected.operation !== res.operation) return;
              // Check model with deepEqual
              if (expected.model) {
                resolve(assert.deepEqual(res.model, expected.model));
              } else {
                resolve();
              }
            });

          });

          return function() {
            return promise;
          };
        };

        beforeEach(function(done) {
          createFav().nodeify(done);
        });

        it('should remove favourite', function(done) {
          var checkEvent = addListenner({
            url: '/user/' + fixture.userFavourite.id + '/rooms',
            operation: 'patch',
            model: {
              id: fixture.troupeCanRemove.id,
              favourite: null,
              lastAccessTime: null,
              mentions: 0,
              unreadItems: 0
            }
          });

          roomService.hideRoomFromUser(fixture.troupeCanRemove.id, fixture.userFavourite.id)
          .then(checkEvent) // Ensure event was emitted
          .then(getFavs)
          .then(function(favs) {
            assert(!favs[fixture.troupeCanRemove.id]); // Favourite is removed
          })
          .then(checkHere)
          .then(function(here) {
            assert(here); // User is still in room
          })
          .done(done);
        });

        it('should remove user from the room if lurking', function(done) {
          // Set user as lurking
          roomService.updateTroupeLurkForUserId(fixture.userFavourite.id, fixture.troupeCanRemove.id, true)
          .then(function() { // Get updated troupe
            return troupeService.findById(fixture.troupeCanRemove.id);
          })
          .then(function(troupe) {
            return roomService.hideRoomFromUser(troupe.id, fixture.userFavourite.id);
          })
          .then(getFavs)
          .then(function(favs) {
            assert(!favs[fixture.troupeCanRemove.id]); // Favourite is removed
          })
          .then(checkHere)
          .then(function(here) {
            assert(!here); // User has been removed
          })
          .done(done);
        });

        it('should check if the proper event is emitted when the favourite is removed', function(done) {
          var checkEvent = addListenner({
            url: '/user/' + fixture.userFavourite.id + '/rooms',
            operation: 'remove',
            model: {id: fixture.troupeEmpty.id}
          });

          userIsInRoom(fixture.troupeEmpty.uri, fixture.userFavourite)
          .then(function(here) {
            assert(!here); // Check that user is not in the room
          })
          .then(function() {
            return roomService.hideRoomFromUser(fixture.troupeEmpty.id, fixture.userFavourite.id);
          })
          .then(checkEvent) // Ensure event was emitted
          .then(getFavs)
          .then(function(favs) {
            assert(!favs[fixture.troupeEmpty.id]); // Favourite is removed
          })
          .done(done);
        });

      });

      describe('#removeUserFromRoom', function() {

        var roomService = testRequire('./services/room-service');

        it('should remove user from room', function(done) {
          return userIsInRoom(fixture.troupeCanRemove.uri, fixture.userLeave)
            .then(function(here) {
              assert(here);
              return roomService.removeUserFromRoom(fixture.troupeCanRemove, fixture.userLeave, fixture.userLeave);
            })
            .then(function() {
              return userIsInRoom(fixture.troupeCanRemove.uri, fixture.userLeave);
            })
            .then(function(here) {
              assert(!here);
            })
            .done(done);
        });

      });

      describe('#removeUserFromRoom', function() {

        var roomPermissionsModelMock = mockito.mockFunction();
        var roomService = testRequire.withProxies('./services/room-service', {
          './room-permissions-model': roomPermissionsModelMock
        });

        mockito.when(roomPermissionsModelMock)().then(function(user, perm) {
          assert.equal(perm, 'admin');

          if(user.id == fixture.userRemoveNonAdmin.id) {
            return Promise.resolve(false);
          } else if(user.id == fixture.userRemoveAdmin.id) {
            return Promise.resolve(true);
          } else {
            assert(false, 'Unknown user');
          }
        });

        it('should prevent non-admin from removing users from rooms', function(done) {
          return userIsInRoom(fixture.troupeCanRemove.uri, fixture.userToRemove)
            .then(function(here) {
              assert(here);
              return roomService.removeUserFromRoom(fixture.troupeCanRemove, fixture.userToRemove, fixture.userRemoveNonAdmin);
            })
            .catch(function(err) {
              assert.equal(err.status, 403);
            })
            .then(function() {
              return userIsInRoom(fixture.troupeCanRemove.uri, fixture.userToRemove);
            })
            .then(function(here) {
              assert(here);
            })
            .done(done);
        });

        it('should prevent from removing users from one-to-one rooms', function(done) {
          return userIsInRoom(fixture.troupeCannotRemove.uri, fixture.userToRemove)
            .then(function(here) {
              assert(here);
              return roomService.removeUserFromRoom(fixture.troupeCannotRemove, fixture.userToRemove, fixture.userRemoveAdmin);
            })
            .catch(function(err) {
              assert.equal(err.status, 400);
              assert.equal(err.message, 'This room does not support removing.');
            })
            .then(function() {
              return userIsInRoom(fixture.troupeCannotRemove.uri, fixture.userToRemove);
            })
            .then(function(here) {
              assert(here);
            })
            .done(done);
        });

        it('should remove users from rooms', function(done) {
          return userIsInRoom(fixture.troupeCanRemove.uri, fixture.userToRemove)
            .then(function(here) {
              assert(here);
              return roomService.removeUserFromRoom(fixture.troupeCanRemove, fixture.userToRemove, fixture.userRemoveAdmin);
            })
            .then(function() {
              return userIsInRoom(fixture.troupeCanRemove.uri, fixture.userToRemove);
            })
            .then(function(here) {
              assert(!here);
            })
            .done(done);
        });

      });

    });

  });

  describe('createGithubRoom #slow', function() {
    it('should create an empty room for an organization', function(done) {
      var permissionsModelMock = mockito.mockFunction();

      var roomService = testRequire.withProxies("./services/room-service", {
        './permissions-model': permissionsModelMock
      });

      mockito
        .when(permissionsModelMock)().then(function (user, right, uri, githubType) {
        assert.equal(user.username, fixture.user1.username);
        assert.equal(right, 'create');
        assert.equal(uri, 'gitterTest');
        assert.equal(githubType, 'ORG');

        return Promise.resolve(true);
      });

      return roomService
        .createGithubRoom(fixture.user1, 'gitterTest')
        .then(function (troupe) {
          assert.equal(troupe.uri, 'gitterTest');
          assert.equal(troupe.userCount, 0);
        })
        .finally(function () {
          return persistence.Troupe.remove({ uri: 'gitterTest' }).exec();
        })
        .nodeify(done);
    });
  });

  describe('renames #slow', function() {
    var originalUrl = 'moo/cow-' + Date.now();
    var renamedUrl = 'bob/renamed-cow-' + Date.now();

    var originalUrl2 = 'moo2/cow-' + Date.now();
    var renamedUrl2 = 'bob2/renamed-cow-' + Date.now();

    var originalUrl3 = 'moo3/cow-' + Date.now();
    var renamedUrl3 = 'bob3/renamed-cow-' + Date.now();

    var permissionsModelMock, roomPermissionsModelMock, roomValidatorMock, roomService;

    var fixture = {};
    before(fixtureLoader(fixture, {
      user1: { },
      user2: { },
      troupeRepo: {
        uri: originalUrl,
        lcUri: originalUrl,
        githubType: 'REPO',
        githubId: true,
        users: ['user1', 'user2']
      },
      troupeRepo2: {
        uri: renamedUrl2,
        lcUri: renamedUrl2,
        githubType: 'REPO',
        githubId: true,
        users: ['user1', 'user2']
      }
    }));

    after(function() {
      fixture.cleanup();
    });

    beforeEach(function() {
      permissionsModelMock = mockito.mockFunction();
      roomPermissionsModelMock = mockito.mockFunction();
      roomValidatorMock = mockito.mockFunction();
      roomService = testRequire.withProxies('./services/room-service', {
        './permissions-model': permissionsModelMock,
        './room-permissions-model': roomPermissionsModelMock,
        'gitter-web-github': {
          GitHubUriValidator: roomValidatorMock
        }
      });
    });

    it('should rename a room if a user attempts to create a new room with an existing githubId', function(done) {
      mockito.when(roomValidatorMock)().then(function() {
        return Promise.resolve({
          type: 'REPO',
          uri: renamedUrl,
          description: 'renamed',
          githubId: fixture.troupeRepo.githubId,
          security: 'PUBLIC'
        });
      });

      mockito.when(permissionsModelMock)().thenReturn(Promise.resolve(true));
      mockito.when(roomPermissionsModelMock)().thenReturn(Promise.resolve(true));

      return roomService.findOrCreateRoom(fixture.user1, renamedUrl, {})
        .then(function(result) {
          assert.strictEqual(result.uri, renamedUrl);

          assert.strictEqual(result.didCreate, false);
          assert.strictEqual(result.troupe.uri, renamedUrl);
          assert.strictEqual(result.troupe.lcUri, renamedUrl);
          assert.strictEqual(result.troupe.renamedLcUris[0], originalUrl);
        })
        .nodeify(done);
    });

    it('should rename a room if a user attempts to create an old room with an existing githubId', function(done) {
      mockito.when(roomValidatorMock)().then(function() {
        return Promise.resolve({
          type: 'REPO',
          uri: renamedUrl2,
          description: 'renamed',
          githubId: fixture.troupeRepo2.githubId,
          security: 'PUBLIC'
        });
      });

      mockito.when(permissionsModelMock)().thenReturn(Promise.resolve(true));
      mockito.when(roomPermissionsModelMock)().thenReturn(Promise.resolve(true));

      return roomService.findOrCreateRoom(fixture.user1, originalUrl2, {})
        .then(function(result) {
          assert.strictEqual(result.uri, renamedUrl2);

          assert.strictEqual(result.didCreate, false);
          assert.strictEqual(result.troupe.uri, renamedUrl2);
          assert.strictEqual(result.troupe.lcUri, renamedUrl2);
        })
        .nodeify(done);
    });

    it('should rename a room if a user attempts to create a new room with an old uri that does not exist', function(done) {
      mockito.when(roomValidatorMock)().then(function() {
        return Promise.resolve({
          type: 'REPO',
          uri: renamedUrl3,
          description: 'renamed',
          githubId: fixture.generateGithubId(),
          security: 'PUBLIC'
        });
      });

      mockito.when(permissionsModelMock)().thenReturn(Promise.resolve(true));
      mockito.when(roomPermissionsModelMock)().thenReturn(Promise.resolve(true));

      return roomService.findOrCreateRoom(fixture.user1, originalUrl3, {})
        .then(function(result) {
          assert.strictEqual(result.uri, renamedUrl3);

          assert.strictEqual(result.didCreate, true);
          assert.strictEqual(result.troupe.uri, renamedUrl3);
          assert.strictEqual(result.troupe.lcUri, renamedUrl3);
          // assert.strictEqual(result.troupe.renamedLcUris[0], originalUrl);
        })
        .nodeify(done);
    });


  });

  describe('createGithubRoom #slow', function() {
    var fixture = {};
    var permissionsModelMock, roomPermissionsModelMock, roomValidatorMock, roomService;

    beforeEach(function() {
      permissionsModelMock = mockito.mockFunction();
      roomPermissionsModelMock = mockito.mockFunction();
      roomValidatorMock = mockito.mockFunction();
      roomService = testRequire.withProxies('./services/room-service', {
        './permissions-model': permissionsModelMock,
        './room-permissions-model': roomPermissionsModelMock,
        'gitter-web-github': {
          GitHubUriValidator: roomValidatorMock
        }
      });
    });

    before(fixtureLoader(fixture, {
      troupeOrg1: {
        githubType: 'ORG',
        users: []
      },
      user1: {}
    }));

    after(function() {
      fixture.cleanup();
    });

    it('should return an new room if one does not exist', function(done) {
      mockito.when(permissionsModelMock)().thenReturn(Promise.resolve(true));
      var orgUri = fixture.generateUri('ORG');
      var githubId = fixture.generateGithubId();
      mockito.when(roomValidatorMock)().then(function() {
        return Promise.resolve({
          type: 'ORG',
          uri: orgUri,
          githubId: githubId,
          description: 'renamed',
          security: 'PUBLIC'
        });
      });

      return roomService.createGithubRoom(fixture.user1, orgUri)
        .then(function(room) {
          assert.strictEqual(room.uri, orgUri);
          assert.strictEqual(room.githubId, githubId);
        })
        .nodeify(done);
    });

    it('should return an existing room if it exists', function(done) {
      mockito.when(permissionsModelMock)().thenReturn(Promise.resolve(true));
      var githubId = fixture.generateGithubId();

      mockito.when(roomValidatorMock)().then(function() {
        return Promise.resolve({
          type: 'ORG',
          uri: fixture.troupeOrg1.uri,
          githubId: githubId,
          description: 'renamed',
          security: 'PUBLIC'
        });
      });

      return roomService.createGithubRoom(fixture.user1, fixture.troupeOrg1.uri)
        .then(function(room) {
          assert.strictEqual(room.id, fixture.troupeOrg1.id);
        })
        .nodeify(done);
    });

  });

  describe('findAllRoomsIdsForUserIncludingMentions', function() {
    var getRoomIdsMentioningUserMock, findRoomIdsForUserMock, roomService;

    beforeEach(function() {
      getRoomIdsMentioningUserMock = mockito.mockFunction();
      findRoomIdsForUserMock = mockito.mockFunction();
      roomService = testRequire.withProxies('./services/room-service', {
        './unread-item-service': {
          getRoomIdsMentioningUser: getRoomIdsMentioningUserMock
        },
        './room-membership-service': {
          findRoomIdsForUser: findRoomIdsForUserMock
        }
      });
    });

    function runWithValues(roomIdsForUser, roomIdsMentioningUser, expected, expectedNonMembers, done) {
      var userId = 'user1';

      mockito.when(getRoomIdsMentioningUserMock)().then(function(pUserId) {
        assert.strictEqual(pUserId, userId);
        return Promise.resolve(roomIdsMentioningUser);
      });

      mockito.when(findRoomIdsForUserMock)().then(function(pUserId) {
        assert.strictEqual(pUserId, userId);
        return Promise.resolve(roomIdsForUser);
      });

      return roomService.findAllRoomsIdsForUserIncludingMentions(userId)
        .spread(function(allTroupeIds, nonMemberTroupeIds) {
          allTroupeIds.sort();
          nonMemberTroupeIds.sort();
          expected.sort();
          expectedNonMembers.sort();
          assert.deepEqual(allTroupeIds, expected);
          assert.deepEqual(nonMemberTroupeIds, expectedNonMembers);
        })
        .nodeify(done);
    }

    it('should handle the trivial case of no rooms', function(done) {
      runWithValues([], [], [], [], done);
    });

    it('should handle the non member rooms only case', function(done) {
      runWithValues([], ['1'], ['1'], ['1'], done);
    });

    it('should handle the member rooms only case', function(done) {
      runWithValues(['1'], [], ['1'], [], done);
    });

    it('should handle the member rooms only case with mentions', function(done) {
      runWithValues(['1'], ['1'], ['1'], [], done);
    });

    it('should handle the mixed cases', function(done) {
      runWithValues(['1','2','3'], ['2','3','4'], ['1','2','3', '4'], ['4'], done);
    });


  });

  describe('joinRoom', function() {
    describe('unit tests', function() {
      var roomService;
      var troupeServiceFindById;
      var roomPermissionsModel;
      var assertMemberLimit;
      var recentRoomServiceSaveLastVisitedTroupeforUserId;
      var roomMembershipServiceAddRoomMember;
      var troupe;
      var access;
      var limitReached;
      var user;
      var userId;
      var troupeId;

      beforeEach(function() {
        userId = 'userId1';
        troupeId = 'troupeId1';
        user = {
          id: userId,
          _id: userId
        };
        troupe = {
          id: troupeId,
          _id: troupeId
        };

        troupeServiceFindById = mockito.mockFunction();
        roomPermissionsModel = mockito.mockFunction();
        assertMemberLimit = mockito.mockFunction();
        recentRoomServiceSaveLastVisitedTroupeforUserId = mockito.mockFunction();
        roomMembershipServiceAddRoomMember = mockito.mockFunction();

        mockito.when(troupeServiceFindById)().then(function(pTroupeId) {
          assert.strictEqual(pTroupeId, troupeId);
          return Promise.resolve(troupe);
        });

        mockito.when(roomPermissionsModel)().then(function(pUser, pPerm, pRoom) {
          assert.strictEqual(pUser, user);
          assert.strictEqual(pPerm, 'join');
          assert.strictEqual(pRoom, troupe);
          return Promise.resolve(access);
        });

        mockito.when(assertMemberLimit)().then(function(pRoom, pUser) {
          assert.strictEqual(pUser, user);
          assert.strictEqual(pRoom, troupe);
          if (limitReached) return Promise.reject(new Error());
          return Promise.resolve();
        });

        mockito.when(recentRoomServiceSaveLastVisitedTroupeforUserId)().then(function(pUserId, pRoomId, pOptions) {
          assert.strictEqual(pUserId, userId);
          assert.strictEqual(pRoomId, troupeId);
          assert.deepEqual(pOptions, { skipFayeUpdate: true });
          return Promise.resolve();
        });

        mockito.when(roomMembershipServiceAddRoomMember)().then(function(pRoomId, pUserId) {
          assert.strictEqual(pUserId, userId);
          assert.strictEqual(pRoomId, troupeId);
          return Promise.resolve();
        });

        roomService = testRequire.withProxies('./services/room-service', {
          './troupe-service': {
            findById: troupeServiceFindById
          },
          './room-membership-service': {
            addRoomMember: roomMembershipServiceAddRoomMember
          },
          './assert-member-limit': assertMemberLimit,
          './recent-room-service': {
            saveLastVisitedTroupeforUserId: recentRoomServiceSaveLastVisitedTroupeforUserId
          },
          './room-permissions-model': roomPermissionsModel
        });
      });

      it('should allow a user to join a room when they have permission', function(done) {
        access = true;
        limitReached = false;
        roomService.joinRoom(troupeId, user)
          .then(function() {
            mockito.verify(troupeServiceFindById, once)();
            mockito.verify(roomPermissionsModel, once)();
            mockito.verify(assertMemberLimit, once)();
            mockito.verify(recentRoomServiceSaveLastVisitedTroupeforUserId, once)();
            mockito.verify(roomMembershipServiceAddRoomMember, once)();
          })
          .nodeify(done);
      });

      it('should deny a user join room when they don\'t have permission', function(done) {
        access = false;
        limitReached = false;

        roomService.joinRoom(troupeId, user)
          .then(function() {
            assert.ok(false, 'Expected an exception');
          }, function(err) {
            assert.strictEqual(err.status, 403);
          })
          .then(function() {
            mockito.verify(troupeServiceFindById, once)();
            mockito.verify(roomPermissionsModel, once)();
          })
          .nodeify(done);
      });

      it('should deny a user join room there are too many people in the room', function(done) {
        access = true;
        limitReached = true;

        roomService.joinRoom(troupeId, user)
          .then(function() {
            assert.ok(false, 'Expected an exception');
          }, function() {
            // Swallow the error
          })
          .then(function() {
            mockito.verify(troupeServiceFindById, once)();
            mockito.verify(roomPermissionsModel, once)();
            mockito.verify(assertMemberLimit, once)();
          })
          .nodeify(done);
      });
    });

    describe('integration tests #slow', function() {
      var fixture = {};
      var roomService;
      var roomPermissionsModel;
      var assertMemberLimit;
      var access;
      var roomMembershipService;

      before(fixtureLoader(fixture, {
        troupeOrg1: {
          githubType: 'ORG',
          users: []
        },
        user1: {}
      }));

      after(function() {
        fixture.cleanup();
      });

      beforeEach(function() {
        roomMembershipService = testRequire('./services/room-membership-service');
        roomPermissionsModel = mockito.mockFunction();
        assertMemberLimit = mockito.mockFunction();

        mockito.when(roomPermissionsModel)().then(function(pUser, pPerm, pRoom) {
          assert.strictEqual(pUser, fixture.user1);
          assert.strictEqual(pPerm, 'join');
          assert.strictEqual(pRoom.id, fixture.troupeOrg1.id);
          return Promise.resolve(access);
        });


        roomService = testRequire.withProxies('./services/room-service', {
          './room-permissions-model': roomPermissionsModel
        });
      });


      it('should add a member to the room', function(done) {
        access = true;

        roomService.joinRoom(fixture.troupeOrg1.id, fixture.user1)
          .then(function() {
            return roomMembershipService.checkRoomMembership(fixture.troupeOrg1.id, fixture.user1.id);
          })
          .then(function(isMember) {
            assert.strictEqual(isMember,true);
          })
          .nodeify(done);
      });

      it('should be idempotent', function(done) {
        access = true;

        roomService.joinRoom(fixture.troupeOrg1.id, fixture.user1)
          .then(function() {
            return roomMembershipService.checkRoomMembership(fixture.troupeOrg1.id, fixture.user1.id);
          })
          .then(function(isMember) {
            assert.strictEqual(isMember,true);
            return roomService.joinRoom(fixture.troupeOrg1.id, fixture.user1);
          })
          .then(function() {
            return roomMembershipService.checkRoomMembership(fixture.troupeOrg1.id, fixture.user1.id);
          })
          .then(function(isMember) {
            assert.strictEqual(isMember,true);
          })
          .nodeify(done);
      });

    });

  });

});
