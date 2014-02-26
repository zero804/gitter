/*jslint node:true, unused:true*/
/*global describe:true, it:true, before:true, after: true */
"use strict";

var testRequire = require('../test-require');
var assert = require('assert');
var fixtureLoader = require('../test-fixtures');
var Q = require('q');
var fixture = {};

before(fixtureLoader(fixture, {
  user1: { },
  user2: { },
  user3: { },
  troupeOrg1: {
    githubType: 'ORG',
    users: ['user1', 'user2']
  },
  troupeRepo: {
    githubType: 'REPO',
    users: ['user1', 'user2']
  }
}));

after(function() {
  fixture.cleanup();
});

var roomService = testRequire("./services/room-service");

function makeRoomAssertions(room, usersAllowedIn, usersNotAllowedIn) {
  assert(room);
  assert(room.uri);

  return Q.all(usersAllowedIn.map(function(user) {

    return roomService.findOrCreateRoom(user, room.uri)
      .then(function(uriLookup) {
        assert(uriLookup);
      });

  })).then(function() {
    return Q.all(usersNotAllowedIn.map(function(user) {
      var failed = 0;
      return roomService.findOrCreateRoom(user, room.uri)
        .then(function() {
          console.log(arguments);
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

describe('room-service', function() {

  describe('classic functionality', function() {

    it('should find or create a room for an org', function(done) {
      return roomService.findOrCreateRoom(fixture.user1, 'gitterTest')
        .then(function(uriContext) {
          assert(!uriContext.oneToOne);
          assert(!uriContext.troupe);
        })
        .nodeify(done);
    });

    it('should find or create a room for a person', function(done) {
      return roomService.findOrCreateRoom(fixture.user1, fixture.user2.username)
        .then(function(uriContext) {
          assert(uriContext.oneToOne);
          assert(uriContext.troupe);
          assert.equal(uriContext.otherUser.id, fixture.user2.id);
        })
        .nodeify(done);
    });

    it('should create a room for a repo', function(done) {
      return roomService.findOrCreateRoom(fixture.user1, 'gitterHQ/cloaked-avenger')
        .nodeify(done);
    });

    it('should handle an invalid url correctly', function(done) {
      return roomService.findOrCreateRoom(fixture.user1, 'joyent')
        .then(function(uriContext) {
          assert(!uriContext.troupe);
        })
        .nodeify(done);
    });

  });

  describe('custom rooms', function() {

    describe('org', function() {

      it('should create private rooms', function(done) {
        return roomService.createCustomChildRoom(fixture.troupeOrg1, fixture.user1, { name: 'private', security: 'PRIVATE' })
          .then(function(room) {
            return makeRoomAssertions(room, [fixture.user1, fixture.user2], [ fixture.user3]);
          })
          .nodeify(done);
      });

      it('should create open rooms', function(done) {
        return roomService.createCustomChildRoom(fixture.troupeOrg1, fixture.user1, { name: 'open', security: 'OPEN' })
          .then(function(room) {
            return makeRoomAssertions(room, [fixture.user1, fixture.user2, fixture.user3], []);
          })
          .nodeify(done);
      });

      it('should create child rooms', function(done) {
        return roomService.createCustomChildRoom(fixture.troupeOrg1, fixture.user1, { name: 'child', security: 'INHERITED' })
          .then(function(room) {
            return makeRoomAssertions(room, [fixture.user1, fixture.user2], [ fixture.user3]);
          })
          .nodeify(done);
      });

    });

    describe('repo', function() {
      it('should create private rooms', function(done) {
        return roomService.createCustomChildRoom(fixture.troupeRepo, fixture.user1, { name: 'private', security: 'PRIVATE' })
          .then(function(room) {
            return makeRoomAssertions(room, [fixture.user1], [fixture.user2, fixture.user3]);
          })
          .nodeify(done);
      });

      it('should create open rooms', function(done) {
        return roomService.createCustomChildRoom(fixture.troupeRepo, fixture.user1, { name: 'open', security: 'OPEN' })
          .then(function(room) {
            return makeRoomAssertions(room, [fixture.user1, fixture.user2, fixture.user3], []);
          })
          .nodeify(done);
      });

      it('should create child rooms', function(done) {
        return roomService.createCustomChildRoom(fixture.troupeRepo, fixture.user1, { name: 'child', security: 'INHERITED' })
          .then(function(room) {
            return makeRoomAssertions(room, [fixture.user1, fixture.user2], [fixture.user3]);
          })
          .nodeify(done);
      });

    });

    describe('user', function() {

      it('should create private rooms without a name', function(done) {
        return roomService.createCustomChildRoom(null, fixture.user1, { security: 'PRIVATE' })
          .then(function(room) {
            return makeRoomAssertions(room, [fixture.user1], [fixture.user2]);
          })

          .nodeify(done);
      });

      it('should create private rooms with name', function(done) {
        return roomService.createCustomChildRoom(null, fixture.user1, { name: 'private',  security: 'PRIVATE' })
          .then(function(room) {
            return makeRoomAssertions(room, [fixture.user1], [fixture.user2]);
          })
          .nodeify(done);
      });

      it('should create open rooms', function(done) {
        return roomService.createCustomChildRoom(null, fixture.user1, { name: 'open', security: 'OPEN' })
          .then(function(room) {
            return makeRoomAssertions(room, [fixture.user1, fixture.user2], []);
          })
          .nodeify(done);
      });

      it('should NOT create child rooms', function(done) {
        var fail = 0;
        return roomService.createCustomChildRoom(null, fixture.user1, { name: 'open', security: 'INHERITED' })
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
});
