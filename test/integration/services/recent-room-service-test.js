/*jslint node:true, unused:true*/
/*global describe:true, it:true, before:true, after: true */
"use strict";

var testRequire = require('../test-require');
var assert = require('assert');
var Q = require('q');
var fixtureLoader = require('../test-fixtures');

var fixture = {};

before(fixtureLoader(fixture, {
  user1: { permissions: { createRoom: true } },
  troupe1: { users: ['user1'] },
  troupe2: { users: ['user1'] },
  troupe3: { users: ['user1'] },
  troupe4: { users: ['user1'] },
}));

after(function() {
  fixture.cleanup();
});

var recentRoomService = testRequire("./services/recent-room-service");
var troupeService = testRequire("./services/troupe-service");
var userService = testRequire("./services/user-service");

describe('recent-room-service', function() {
  it('should generateRoomListForUser with favourites', function(done) {
    return troupeService.updateFavourite(fixture.user1.id, fixture.troupe1.id, 2)
      .then(function() {
        return troupeService.updateFavourite(fixture.user1.id, fixture.troupe2.id, 1);
      })
      .then(function() {
        return troupeService.updateFavourite(fixture.user1.id, fixture.troupe3.id, true);
      })
      .then(function() {
        return recentRoomService.generateRoomListForUser(fixture.user1);
      })
      .then(function(roomList) {
        assert.equal(roomList.length, 3);
        assert.equal(roomList[0].id, fixture.troupe2.id);
        assert.equal(roomList[1].id, fixture.troupe1.id);
        assert.equal(roomList[2].id, fixture.troupe3.id);
      })
      .nodeify(done);
  });

  it('should generateRoomListForUser with favourites and recents', function(done) {
    return Q.all([
        troupeService.updateFavourite(fixture.user1.id, fixture.troupe1.id, 2),
        troupeService.updateFavourite(fixture.user1.id, fixture.troupe2.id, 1),
        userService.saveLastVisitedTroupeforUserId(fixture.user1.id, fixture.troupe3.id),
        userService.saveLastVisitedTroupeforUserId(fixture.user1.id, fixture.troupe4.id)
      ])
      .then(function() {
        return recentRoomService.generateRoomListForUser(fixture.user1);
      })
      .then(function(roomList) {
        assert.equal(roomList.length, 4);
        assert.equal(roomList[0].id, fixture.troupe2.id);
        assert.equal(roomList[1].id, fixture.troupe1.id);
        assert.equal(roomList[2].id, fixture.troupe3.id);
        assert.equal(roomList[3].id, fixture.troupe4.id);
      })
      .nodeify(done);
  });

});
