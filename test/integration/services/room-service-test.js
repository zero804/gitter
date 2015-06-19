/*jslint node:true, unused:true*/
/*global describe:true, it:true, before:true, after: true */
"use strict";

var testRequire = require('../test-require');
var assert = require('assert');
var fixtureLoader = require('../test-fixtures');
var Q = require('q');
var fixture = {};

var mockito = require('jsmockito').JsMockito;
var times = mockito.Verifiers.times;
var once = times(1);

Q.longStackSupport = true;

var troupeService = testRequire("./services/troupe-service");
var persistence = testRequire("./services/persistence-service");

function makeRoomAssertions(room, usersAllowedIn, usersNotAllowedIn) {
  return Q.resolve(true);

  var roomService = testRequire("./services/room-service");

  if(!room) return Q.reject('no room');
  if(!room.uri) return Q.reject('no room.uri');

  return Q.all(usersAllowedIn.map(function(user) {

    return roomService.findOrCreateRoom(user, room.uri)
      .then(function(uriLookup) {
        assert(uriLookup);
      })
      .fail(function(err) {
        // console.log('User ' + user.username + ' was incorrectly NOT allowed in the room');
        throw err;
      });

  })).then(function() {
    return Q.all(usersNotAllowedIn.map(function(user) {
      var failed = 0;
      return roomService.findOrCreateRoom(user, room.uri)
        .then(function() {
          // console.log('User ' + user.username + ' was incorrectly allowed in the room');
        })
        .fail(function() {
          failed++;
        })
        .then(function() {
          assert.equal(failed, 1);
        });
    }));
  });
}

describe('room-service #slow', function() {
  before(fixtureLoader(fixture, {
    user1: { },
    user2: { },
    user3: { },
    troupeOrg1: {
      githubType: 'ORG',
      users: ['user1', 'user2']
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
    troupeBulkLurk: {
      security: 'PUBLIC',
      githubType: 'REPO',
      users: ['user1', 'user2', 'user3']
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
    it('should allow users to be lurked in bulk', function (done) {

      var roomService = testRequire('./services/room-service');
      return roomService.bulkLurkUsers(fixture.troupeBulkLurk.id, [fixture.user1.id, fixture.user2.id])
        .then(function() {
          return persistence.Troupe.findByIdQ(fixture.troupeBulkLurk.id)
            .then(function(troupe) {
              var lurkForUsers = troupe.users.reduce(function(memo, troupeUser) {
                memo[troupeUser.userId] = troupeUser.lurk;
                return memo;
              }, {});

              assert(lurkForUsers[fixture.user1.id]);
              assert(lurkForUsers[fixture.user2.id]);
              assert(!lurkForUsers[fixture.user3.id]);
            });
        })
        .nodeify(done);
    });

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

        return Q.resolve(false);
      });

      return roomService.findOrCreateRoom(fixture.user1, 'gitterTest')
        .then(function (uriContext) {
          assert.equal(uriContext, null);
        })
        .nodeify(done);
    });

    it('should deny access but provide public rooms #slow', function (done) {

      var permissionsModelMock = mockito.mockFunction();
      var uriLookupServiceMock = mockito.mock(testRequire('./services/uri-lookup-service'));
      var troupeServiceMock = mockito.mock(testRequire('./services/troupe-service'));

      var roomService = testRequire.withProxies('./services/room-service', {
        './uri-lookup-service': uriLookupServiceMock,
        './permissions-model': permissionsModelMock,
        './troupe-service':  troupeServiceMock
      });

      mockito
        .when(permissionsModelMock)()
        .then(function (user, right, uri, githubType) {
          assert.equal(user.username, fixture.user1.username);
          assert.equal(right, 'create');
          assert.equal(uri, 'gitterTest');
          assert.equal(githubType, 'ORG');

          return Q.resolve(false);
        });

      mockito
        .when(uriLookupServiceMock)
        .lookupUri()
        .then(function () {
          return Q.resolve({
            uri: 'gitterTest',
            troupeId: '5436981c00062eebf0fbc0d5'
          });
        });

      mockito
        .when(troupeServiceMock)
        .findById()
        .then(function (room) {
          return Q.resolve({
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
              containsUserId: function () {

              }
          });
        });

      // test
      roomService
        .findOrCreateRoom(fixture.user1, 'gitterTest')
        .then(function (uriContext) {
          var githubType = uriContext.accessDenied && uriContext.accessDenied.githubType;
          assert(githubType === 'ORG');
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

        return Q.resolve(true);
      });

      return roomService
        .findOrCreateRoom(fixture.user1, 'gitterTest')
        .then(function (uriContext) {
          assert(uriContext.didCreate);
          assert.equal(uriContext.troupe.uri, 'gitterTest');
        })
        .finally(function () {
          return persistence.Troupe.removeQ({ uri: 'gitterTest' });
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

        return Q.resolve(true);
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
      var roomService = testRequire("./services/room-service");

      return roomService.findOrCreateRoom(fixture.user1, 'gitterHQ/cloaked-avenger')
        .nodeify(done);
    });

    it('should create a room for a repo ignoring the case', function(done) {
      return persistence.Troupe.findOneAndRemoveQ({ lcUri: 'gitterhq/sandbox' })
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

            return Q.resolve(true);
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
      return persistence.Troupe.findOneAndRemoveQ({ lcUri: 'gitterhq/sandbox' })
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

            return Q.resolve(true);
          });

          return roomService.findOrCreateRoom(fixture.user1, 'gitterhq/sandbox')
            .then(function() {
              assert(false, 'Expected redirect');
            }, function(err) {
              assert(err.redirect, 'gitterHQ/sandbox');
            });
        })
        .nodeify(done);
    });

    it('should handle an invalid url correctly', function(done) {
      var roomService = testRequire("./services/room-service");

      return roomService.findOrCreateRoom(fixture.user1, 'joyent')
        .then(function (uriContext) {
          assert(!uriContext);
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
        return Q.resolve(false);
      });

      return roomService.findOrCreateRoom(fixture.user3, fixture.troupeOrg1.uri)
        .then(function(result) {
          assert(result.accessDenied);
          assert.strictEqual(result.accessDenied.githubType, 'ORG');
          assert.strictEqual(result.uri, fixture.troupeOrg1.uri);
        })
        .nodeify(done);
    });
  });

  describe('user revalidation', function() {
    it('should correctly revalidate the users in a room', function(done) {
      var roomPermissionsModelMock = mockito.mockFunction();

      var roomService = testRequire.withProxies("./services/room-service", {
        './room-permissions-model': roomPermissionsModelMock
      });

      mockito.when(roomPermissionsModelMock)().then(function(user, perm, incomingRoom) {
        assert.equal(perm, 'join');
        assert.equal(incomingRoom.id, fixture.troupeRepo.id);

        if(user.id == fixture.user1.id) {
          return Q.resolve(true);
        } else if(user.id == fixture.user2.id) {
          return Q.resolve(false);
        } else {
          assert(false, 'Unknown user');
        }

      });

      return roomService.revalidatePermissionsForUsers(fixture.troupeRepo)
        .then(function() {
          var userIds = fixture.troupeRepo.getUserIds();
          assert.equal(userIds.length, 1);
          assert.equal(userIds[0], fixture.user1.id);
        })
        .nodeify(done);

    });
  });

  describe('addUserToRoom', function() {

    function createRoomServiceWithStubs(stubs) {
      return testRequire.withProxies("./services/room-service", {
        './room-permissions-model': function() {
          return Q.resolve(stubs.addUser);
        },
        './invited-permissions-service': function() {
          return Q.resolve(stubs.canBeInvited);
        },
        './user-service': {
          createInvitedUser: function() {
            return Q.resolve(stubs.createInvitedUserResult);
          },
          findByUsername: function() {
            return Q.resolve(stubs.findByUsernameResult);
          }
        },
        './email-notification-service': {
          sendInvitation: stubs.onInviteEmail,
          addedToRoomNotification: function() {}
        },
        './email-address-service': function() {
          return Q.resolve('a@b.com');
        }
      });
    }

    it('adds a user to the troupe', function(done) {
      var service = createRoomServiceWithStubs({
        addUser: true,
        findByUsernameResult: { username: 'test-user', id: 'test-user-id' },
        createInvitedUserResult: null,
        canBeInvited: true,
        onInviteEmail: function() {}
      });

      var troupe = {
        uri: 'user/room',
        containsUserId: function() { return false; },
        addUserById: function(id) {
          assert.equal(id, 'test-user-id');
          done();
        },
        saveQ: function() {
          return Q.resolve();
        }
      };
      service.addUserToRoom(troupe, {}, 'test-user').fail(done);
    });

    it('saves troupe changes', function(done) {
      var service = createRoomServiceWithStubs({
        addUser: true,
        findByUsernameResult: { username: 'test-user', id: 'test-user-id' },
        createInvitedUserResult: null,
        canBeInvited: true,
        onInviteEmail: function() {}
      });

      var troupe = {
        uri: 'user/room',
        containsUserId: function() { return false; },
        addUserById: function() {},
        saveQ: function() {
          done();
          return Q.resolve();
        }
      };
      service.addUserToRoom(troupe, {}, 'test-user').fail(done);
    });

    it('returns the added user', function(done) {
      var service = createRoomServiceWithStubs({
        addUser: true,
        findByUsernameResult: { username: 'test-user', id: 'test-user-id' },
        createInvitedUserResult: null,
        canBeInvited: true,
        onInviteEmail: function() {}
      });

      var troupe = {
        uri: 'user/room',
        containsUserId: function() { return false; },
        addUserById: function() {},
        saveQ: function() {
          return Q.resolve();
        }
      };

      service.addUserToRoom(troupe, {}, 'test-user')
        .then(function(user) {
          assert.equal(user.id, 'test-user-id');
          assert.equal(user.username, 'test-user');
        }).nodeify(done);
    });

    it('attempts an email invite for new users', function(done) {
      var service = createRoomServiceWithStubs({
        addUser: true,
        findByUsernameResult: null,
        createInvitedUserResult: {
          username: 'test-user',
          id: 'test-user-id',
          state: 'INVITED',
          emails: ['a@b.com']
        },
        canBeInvited: true,
        onInviteEmail: function() {
          done();
        }
      });

      var troupe = {
        uri: 'user/room',
        containsUserId: function() { return false; },
        addUserById: function() {},
        saveQ: function() {
          return Q.resolve();
        }
      };

      service.addUserToRoom(troupe, {}, 'test-user').fail(done);
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
        containsUserId: function() { return false; },
        addUserById: function() {},
        saveQ: function() {}
      };

      service.addUserToRoom(troupe, {}, 'test-user').fail(function(err) {
        assert.equal(err.status, 403);
      }).nodeify(done);
    });

    it('fails with 409 when adding someone who is already in the room', function(done) {
      var service = createRoomServiceWithStubs({
        addUser: true,
        findByUsernameResult: { username: 'test-user', id: 'test-user-id' },
        createInvitedUserResult: null,
        canBeInvited: true,
        onInviteEmail: function() {}
      });

      var troupe = {
        uri: 'user/room',
        containsUserId: function() { return true; },
        addUserById: function() {},
        saveQ: function() {}
      };

      service.addUserToRoom(troupe, {}, 'test-user').fail(function(err) {
        assert.equal(err.status, 409);
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
        containsUserId: function() { return true; },
        addUserById: function() {},
        saveQ: function() {}
      };

      service.addUserToRoom(troupe, {}, 'test-user').fail(function(err) {
        assert.equal(err.status, 403);
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
          return Q.resolve(true);
        });

        return roomService.createCustomChildRoom(fixture.troupeOrg1, fixture.user1, { name: 'private', security: 'PRIVATE' })
          .then(function(room) {
            mockito.verify(permissionsModelMock, once)();

            return makeRoomAssertions(room, [fixture.user1, fixture.user2], [fixture.user3])
              .thenResolve(room);
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
              return Q.resolve(true);
            });

            return roomService.addUserToRoom(room, fixture.user1, fixture.user3.username)
              .then(function() {
                mockito.verify(permissionsModelMock, once)();
              })
              .thenResolve(room);
          })
          .then(function(room) {
            return troupeService.findById(room.id);
          })
          .then(function(room) {
            assert(room.containsUserId(fixture.user3.id), 'Expected to find newly added user in the room');
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
          return Q.resolve(true);
        });

        return roomService.createCustomChildRoom(fixture.troupeOrg1, fixture.user1, { name: 'open', security: 'PUBLIC' })
          .then(function(room) {
            mockito.verify(permissionsModelMock, once)();

            return makeRoomAssertions(room, [fixture.user1, fixture.user2, fixture.user3], [])
              .thenResolve(room);
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
              return Q.resolve(true);
            });

            return roomService.addUserToRoom(room, fixture.user1, fixture.user3.username)
              .then(function() {
                mockito.verify(roomPermissionsModelMock, once)();
              })
              .thenResolve(room);
          })
          .then(function(room) {
            return troupeService.findById(room.id);
          })
          .then(function(room) {
            assert(room.containsUserId(fixture.user3.id), 'Expected to find newly added user in the room');
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
          return Q.resolve(true);
        });

        return roomService.createCustomChildRoom(fixture.troupeOrg1, fixture.user1, { name: 'child', security: 'INHERITED' })
          .then(function(room) {
            mockito.verify(permissionsModelMock, once)();

            return makeRoomAssertions(room, [fixture.user1, fixture.user2], [ fixture.user3])
              .thenResolve(room);
          })
          .then(function(room) {
            // Get another mock
            // ADD A PERSON TO THE ROOM
            var roomPermissionsModelMock = mockito.mockFunction();
            var roomService = testRequire.withProxies("./services/room-service", {
              './room-permissions-model': roomPermissionsModelMock,
              './invited-permissions-service': function() { return Q.resolve(true); }
            });

            mockito.when(roomPermissionsModelMock)().then(function(user, perm, _room) {
              assert.equal(user.id, fixture.user1.id);
              assert.equal(perm, 'adduser');
              assert.equal(room.id, _room.id);
              return Q.resolve(true);
            });

            return roomService.addUserToRoom(room, fixture.user1, fixture.user3.username)
              .then(function() {
                mockito.verify(roomPermissionsModelMock, once)();
              })
              .thenResolve(room);
          })
          .then(function(room) {
            return troupeService.findById(room.id);
          })
          .then(function(room) {
            assert(room.containsUserId(fixture.user3.id), 'Expected to find newly added user in the room');
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
          return Q.resolve(true);
        });

        return roomService.createCustomChildRoom(fixture.troupeRepo, fixture.user1, { name: 'private', security: 'PRIVATE' })
          .then(function(room) {
            mockito.verify(permissionsModelMock, once)();

            return makeRoomAssertions(room, [fixture.user1], [fixture.user2, fixture.user3])
              .thenResolve(room);
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
              return Q.resolve(true);
            });

            return roomService.addUserToRoom(room, fixture.user1, fixture.user3.username)
              .then(function() {
                mockito.verify(roomPermissionsModelMock, once)();
              })
              .thenResolve(room);
          })
          .then(function(room) {
            return troupeService.findById(room.id);
          })
          .then(function(room) {
            assert(room.containsUserId(fixture.user3.id), 'Expected to find newly added user in the room');
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
          return Q.resolve(true);
        });

        return roomService.createCustomChildRoom(fixture.troupeRepo, fixture.user1, { name: 'open', security: 'PUBLIC' })
          .then(function(room) {
            mockito.verify(permissionsModelMock, once)();

            return makeRoomAssertions(room, [fixture.user1, fixture.user2, fixture.user3], [])
              .thenResolve(room);
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
              return Q.resolve(true);
            });

            return roomService.addUserToRoom(room, fixture.user1, fixture.user3.username)
              .then(function() {
                mockito.verify(roomPermissionsModelMock, once)();
              })
              .thenResolve(room);
          })
          .then(function(room) {
            return troupeService.findById(room.id);
          })
          .then(function(room) {
            assert(room.containsUserId(fixture.user3.id), 'Expected to find newly added user in the room');
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
          return Q.resolve(true);
        });

        return roomService.createCustomChildRoom(fixture.troupeRepo, fixture.user1, { name: 'child', security: 'INHERITED' })
          .then(function(room) {
            mockito.verify(permissionsModelMock, once)();

            return makeRoomAssertions(room, [fixture.user1, fixture.user2], [fixture.user3])
              .thenResolve(room);
          })
          .then(function(room) {
            // Get another mock
            // ADD A PERSON TO THE ROOM
            var roomPermissionsModelMock = mockito.mockFunction();
            var roomService = testRequire.withProxies("./services/room-service", {
              './room-permissions-model': roomPermissionsModelMock,
              './invited-permissions-service': function() { return Q.resolve(true); }
            });

            mockito.when(roomPermissionsModelMock)().then(function(user, perm, _room) {
              assert.equal(user.id, fixture.user1.id);
              assert.equal(perm, 'adduser');
              assert.equal(_room.id, room.id);
              return Q.resolve(true);
            });

            return roomService.addUserToRoom(room, fixture.user1, fixture.user3.username)
              .then(function() {
                mockito.verify(permissionsModelMock, once)();
              })
              .thenResolve(room);
          })
          .then(function(room) {
            return troupeService.findById(room.id);
          })
          .then(function(room) {
            assert(room.containsUserId(fixture.user3.id), 'Expected to find newly added user in the room');
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
          return Q.resolve(true);
        });

        return roomService.createCustomChildRoom(null, fixture.user1, { security: 'PRIVATE' })
          .then(function(room) {
            mockito.verify(permissionsModelMock, once)();

            return makeRoomAssertions(room, [fixture.user1], [fixture.user2])
              .thenResolve(room);
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
              return Q.resolve(true);
            });

            return roomService.addUserToRoom(room, fixture.user1, fixture.user3.username)
              .then(function() {
                mockito.verify(roomPermissionsModelMock, once)();
              })
              .thenResolve(room);
          })
          .then(function(room) {
            return troupeService.findById(room.id);
          })
          .then(function(room) {
            assert(room.containsUserId(fixture.user3.id), 'Expected to find newly added user in the room');
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
          return Q.resolve(true);
        });

        return roomService.createCustomChildRoom(null, fixture.user1, { name: 'private',  security: 'PRIVATE' })
          .then(function(room) {
            mockito.verify(permissionsModelMock, once)();

            return makeRoomAssertions(room, [fixture.user1], [fixture.user2])
              .thenResolve(room);
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
              return Q.resolve(true);
            });

            return roomService.addUserToRoom(room, fixture.user1, fixture.user3.username)
              .then(function() {
                mockito.verify(roomPermissionsModelMock, once)();
              })
              .thenResolve(room);
          })
          .then(function(room) {
            return troupeService.findById(room.id);
          })
          .then(function(room) {
            assert(room.containsUserId(fixture.user3.id), 'Expected to find newly added user in the room');
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
          return Q.resolve(true);
        });

        return roomService.createCustomChildRoom(null, fixture.user1, { name: 'open', security: 'PUBLIC' })
          .then(function(room) {
            mockito.verify(permissionsModelMock, once)();

            return makeRoomAssertions(room, [fixture.user1, fixture.user2], [])
              .thenResolve(room);
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
              return Q.resolve(true);
            });

            return roomService.addUserToRoom(room, fixture.user1, fixture.user3.username)
              .then(function() {
                mockito.verify(roomPermissionsModelMock, once)();
              })
              .thenResolve(room);
          })
          .then(function(room) {
            return troupeService.findById(room.id);
          })
          .then(function(room) {
            assert(room.containsUserId(fixture.user3.id), 'Expected to find newly added user in the room');
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
          .fail(function() {
            fail++;
          })
          .then(function() {
            assert.equal(fail, 1);
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
      var userBannedFromRoom = testRequire('./services/user-banned-from-room');

      mockito.when(roomPermissionsModelMock)().then(function(user, perm, incomingRoom) {
        assert.equal(perm, 'admin');
        assert.equal(incomingRoom.id, fixture.troupeBan.id);

        if(user.id == fixture.userBan.id) {
          return Q.resolve(false);
        } else if(user.id == fixture.userBanAdmin.id) {
          return Q.resolve(true);
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

              return persistence.Troupe.findByIdQ(fixture.troupeBan.id);
            })
            .then(function(troupe) {
              assert(!troupe.containsUserId(fixture.userBan.id));

              return roomService.findBanByUsername(troupe.id, fixture.userBan.username);
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
          return Q.resolve(true);
        } else if(user.id == fixture.userBanAdmin.id) {
          return Q.resolve(true);
        } else {
          assert(false, 'Unknown user');
        }
      });


      return roomService.banUserFromRoom(fixture.troupeBan, fixture.userBan.username, fixture.userBanAdmin, {})
        .then(function() {
          assert(false, 'Expected to fail as user is not an admin');
        })
        .fail(function(err) {
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

    mockito.when(roomPermissionsModelMock)().then(function(user, perm, incomingRoom) {
      assert.equal(perm, 'admin');

      if(user.id == fixture.userRemoveNonAdmin.id) {
        return Q.resolve(false);
      } else if(user.id == fixture.userRemoveAdmin.id) {
        return Q.resolve(true);
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

  describe('renames', function() {
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
        return Q.resolve({
          type: 'REPO',
          uri: renamedUrl,
          description: 'renamed',
          githubId: fixture.troupeRepo.githubId,
          security: 'PUBLIC'
        });
      });

      mockito.when(permissionsModelMock)().thenReturn(Q.resolve(true));
      mockito.when(roomPermissionsModelMock)().thenReturn(Q.resolve(true));

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
        return Q.resolve({
          type: 'REPO',
          uri: renamedUrl2,
          description: 'renamed',
          githubId: fixture.troupeRepo2.githubId,
          security: 'PUBLIC'
        });
      });

      mockito.when(permissionsModelMock)().thenReturn(Q.resolve(true));
      mockito.when(roomPermissionsModelMock)().thenReturn(Q.resolve(true));

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
        return Q.resolve({
          type: 'REPO',
          uri: renamedUrl3,
          description: 'renamed',
          githubId: fixture.generateGithubId(),
          security: 'PUBLIC'
        });
      });

      mockito.when(permissionsModelMock)().thenReturn(Q.resolve(true));
      mockito.when(roomPermissionsModelMock)().thenReturn(Q.resolve(true));

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

});
