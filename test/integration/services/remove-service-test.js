/*jslint node:true, unused:true*/
/*global describe:true, it:true, beforeEach:true, afterEach: true */
"use strict";

var testRequire = require('../test-require');
var assert = require('assert');
var fixtureLoader = require('../test-fixtures');
var Q = require('q');
var fixture = {};
var troupeService = testRequire('./services/troupe-service');
var recentRoomService = testRequire('./services/recent-room-service');
var userIsInRoom = testRequire('./services/user-in-room');
var appEvents = testRequire('./app-events');

var mockito = require('jsmockito').JsMockito;

Q.longStackSupport = true;

describe('remove-service', function() {

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

    var removeService = testRequire('./services/remove-service');

    var getFavs = function() {
      return recentRoomService.findFavouriteTroupesForUser(fixture.userFavourite.id);
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
      var dfd = Q.defer();
      appEvents.onDataChange2(function(res) {
        // First filter by url and operation, as other events may have been emitted
        if (expected.url && expected.url !== res.url) return;
        if (expected.operation && expected.operation !== res.operation) return;
        // Check model with deepEqual
        if (expected.model) dfd.resolve(assert.deepEqual(res.model, expected.model));
        else dfd.resolve();
      });
      return function() {
        return dfd.promise;
      };
    };

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

      createFav()
      .then(function() {
        return removeService.removeRecentRoomForUser(fixture.troupeCanRemove, fixture.userFavourite.id);
      })
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
      createFav()
      .then(function() { // Set user as lurking
        return troupeService.updateTroupeLurkForUserId(fixture.userFavourite.id, fixture.troupeCanRemove.id, true);
      })
      .then(function() { // Get updated troupe
        return troupeService.findById(fixture.troupeCanRemove.id);
      })
      .then(function(troupe) {
        return removeService.removeRecentRoomForUser(troupe, fixture.userFavourite.id);
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

      createFav()
      .then(function() {
        return userIsInRoom(fixture.troupeEmpty.uri, fixture.userFavourite);
      })
      .then(function(here) {
        assert(!here); // Check that user is not in the room
      })
      .then(function() {
        return removeService.removeRecentRoomForUser(fixture.troupeEmpty, fixture.userFavourite.id);
      })
      .then(checkEvent) // Ensure event was emitted
      .then(getFavs)
      .then(function(favs) {
        assert(!favs[fixture.troupeEmpty.id]); // Favourite is removed
      })
      .done(done);
    });

  });

  describe('#userLeaveRoom', function() {

    var removeService = testRequire('./services/remove-service');

    it('should remove user from room', function(done) {
      return userIsInRoom(fixture.troupeCanRemove.uri, fixture.userLeave)
        .then(function(here) {
          assert(here);
          return removeService.userLeaveRoom(fixture.troupeCanRemove, fixture.userLeave);
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
    var removeService = testRequire.withProxies('./services/remove-service', {
      './room-permissions-model': roomPermissionsModelMock
    });

    mockito.when(roomPermissionsModelMock)().then(function(user, perm) {
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
          return removeService.removeUserFromRoom(fixture.troupeCanRemove, fixture.userToRemove, fixture.userRemoveNonAdmin);
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
          return removeService.removeUserFromRoom(fixture.troupeCannotRemove, fixture.userToRemove, fixture.userRemoveAdmin);
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
          return removeService.removeUserFromRoom(fixture.troupeCanRemove, fixture.userToRemove, fixture.userRemoveAdmin);
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
