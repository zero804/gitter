/*jslint node:true, unused:true*/
/*global describe:true, it:true, before:true, after: true */
"use strict";

var testRequire = require('../test-require');
var assert = require('assert');
var fixtureLoader = require('../test-fixtures');
var Q = require('q');
var fixture = {};

var mockito = require('jsmockito').JsMockito;

Q.longStackSupport = true;

before(fixtureLoader(fixture, {
  troupeCanRemove: {
    security: 'PUBLIC',
    githubType: 'REPO',
    users: ['userLeave', 'userToRemove', 'userRemoveNonAdmin', 'userRemoveAdmin']
  },
  troupeCannotRemove: {
    security: 'PRIVATE',
    githubType: 'ONETOONE',
    users: ['userToRemove', 'userRemoveAdmin']
  },
  userLeave: {},
  userToRemove: {},
  userRemoveNonAdmin: {},
  userRemoveAdmin: {}
}));

after(function() {
  fixture.cleanup();
});

describe('remove-service', function() {

  describe('remove room from recent', function() {

    // check cases if is member / is lurking (appEvents)

  });

  describe('user leaves room', function() {

    var removeService = testRequire('./services/remove-service');
    var userIsInRoom = testRequire('./services/user-in-room');

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

  describe('remove user from room', function() {

    var roomPermissionsModelMock = mockito.mockFunction();
    var removeService = testRequire.withProxies('./services/remove-service', {
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
