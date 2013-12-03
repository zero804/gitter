/*jslint node:true, unused:true*/
/*global describe:true, it:true, before:true, after: true */
"use strict";

var testRequire = require('../test-require');
var assert = require('assert');
var fixtureLoader = require('../test-fixtures');

var fixture = {};

before(fixtureLoader(fixture, {
  user1: { permissions: { createRoom: true } },
  user2: { }
}));

after(function() {
  fixture.cleanup();
});

var roomService = testRequire("./services/room-service");

describe('room-service', function() {
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
