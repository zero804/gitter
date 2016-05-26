"use strict";

var testRequire = require('../../test-require');
var assert = require('assert');
var Promise = require('bluebird');
var fixtureLoader = require('../../test-fixtures');
var ObjectID = require('mongodb').ObjectID;
var recentRoomCore = testRequire("./services/core/recent-room-core");

describe('recent-room-core', function() {
  describe('ordering #slow', function() {
    var fixture = {};

    before(fixtureLoader(fixture, {
      user1: { },
      userNoTroupes: { },
      troupe1: { users: ['user1'] },
      troupe2: { users: ['user1'] },
      troupe3: { users: ['user1'] },
      troupe4: { users: ['user1'] }
    }));

    after(function() {
      fixture.cleanup();
    });

    it('should rearrange the order of favourites correctly',function(done) {
      this.timeout(10000);

      function getFavs() {
        return recentRoomCore.findFavouriteTroupesForUser(fixture.user1.id);
      }

      recentRoomCore.updateFavourite(fixture.user1.id, fixture.troupe1.id, 1)
        .then(getFavs)
        .then(function(favs) {
          assert.equal(favs[fixture.troupe1.id], 1);
        })
        .then(function() {
          return recentRoomCore.updateFavourite(fixture.user1.id, fixture.troupe2.id, 1);
        })
        .then(getFavs)
        .then(function(favs) {
          assert.equal(favs[fixture.troupe1.id], 2);
          assert.equal(favs[fixture.troupe2.id], 1);
        })
        .then(function() {
          return recentRoomCore.updateFavourite(fixture.user1.id, fixture.troupe2.id, 3);
        })
        .then(getFavs)
        .then(function(favs) {
          assert.equal(favs[fixture.troupe1.id], 2);
          assert.equal(favs[fixture.troupe2.id], 3);
        })
        .then(function() {
          return recentRoomCore.updateFavourite(fixture.user1.id, fixture.troupe3.id, 1);
        })
        .then(getFavs)
        .then(function(favs) {
          assert.equal(favs[fixture.troupe3.id], 1);
          assert.equal(favs[fixture.troupe1.id], 2);
          assert.equal(favs[fixture.troupe2.id], 3);
        })
        .then(function() {
          return recentRoomCore.updateFavourite(fixture.user1.id, fixture.troupe2.id, 2);
        })
        .then(getFavs)
        .then(function(favs) {
          assert.equal(favs[fixture.troupe3.id], 1);
          assert.equal(favs[fixture.troupe2.id], 2);
          assert.equal(favs[fixture.troupe1.id], 3);
        })
        .then(function() {
          return recentRoomCore.updateFavourite(fixture.user1.id, fixture.troupe1.id, 4);
        })
        .then(getFavs)
        .then(function(favs) {
          assert.equal(favs[fixture.troupe3.id], 1);
          assert.equal(favs[fixture.troupe2.id], 2);
          assert.equal(favs[fixture.troupe1.id], 4);
        })
        .then(function() {
          return recentRoomCore.updateFavourite(fixture.user1.id, fixture.troupe4.id, 1);
        })
        .then(getFavs)
        .then(function(favs) {
          assert.equal(favs[fixture.troupe4.id], 1);
          assert.equal(favs[fixture.troupe3.id], 2);
          assert.equal(favs[fixture.troupe2.id], 3);
          assert.equal(favs[fixture.troupe1.id], 4);
        })

        .nodeify(done);
    });

  });

  describe('updateFavourite #slow', function() {
    var fixture = {};

    before(fixtureLoader(fixture, {
      user1: { },
      troupe1: { users: ['user1'] }
    }));

    after(function() {
      fixture.cleanup();
    });

    it('should add a troupe to favourites',function(done) {

      function fav(val, callback) {
        return recentRoomCore.updateFavourite(fixture.user1.id, fixture.troupe1.id, val)
          .then(function() {
            return recentRoomCore.findFavouriteTroupesForUser(fixture.user1.id);
          })
          .then(function(favs) {
            var isInTroupe = !!favs[fixture.troupe1.id];
            assert(isInTroupe === val, 'Troupe should ' + (val? '': 'not ') + 'be a favourite');
          })
          .nodeify(callback);
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

  describe('findLastAccessTimesForUsersInRoom #slow', function() {
    var fixture = {};

    before(fixtureLoader(fixture, {
      user1: { },
      user2: { },
      troupe1: { users: ['user1'] }
    }));

    after(function() {
      fixture.cleanup();
    });

    it('should handle default values', function(done) {
      return recentRoomCore.findLastAccessTimesForUsersInRoom(fixture.troupe1.id, [fixture.user1.id, fixture.user2._id])
        .then(function(result) {
          assert(result[fixture.user1.id]);
          assert(result[fixture.user2.id]);
        })
        .nodeify(done);
    });

    it('should handle non default values', function(done) {
      return Promise.all([
          recentRoomCore.saveUserTroupeLastAccess(fixture.user1.id, fixture.troupe1.id),
          recentRoomCore.saveUserTroupeLastAccess(fixture.user2.id, fixture.troupe1.id)
        ])
        .then(function() {
          return recentRoomCore.findLastAccessTimesForUsersInRoom(fixture.troupe1.id, [fixture.user1.id, fixture.user2._id]);
        })
        .then(function(result) {
          var d1 = Date.now() - result[fixture.user1.id];
          var d2 = Date.now() - result[fixture.user2.id];
          assert(d1 >= 0);
          assert(d1 < 5000);

          assert(d2 >= 0);
          assert(d2 < 5000);
        })
        .nodeify(done);
    });

  });

  describe('saveUserTroupeLastAccess #slow', function() {
    it('should update on insert', function() {
      var userId = new ObjectID();
      var troupeId = new ObjectID();
      return recentRoomCore.saveUserTroupeLastAccess(userId, troupeId)
        .then(function(didUpdate) {
          assert.strictEqual(didUpdate, true);
        })
    });

    it('should update on update', function() {
      var userId = new ObjectID();
      var troupeId = new ObjectID();
      var troupeId2 = new ObjectID();
      return recentRoomCore.saveUserTroupeLastAccess(userId, troupeId)
        .then(function(didUpdate) {
          assert.strictEqual(didUpdate, true);
          return recentRoomCore.saveUserTroupeLastAccess(userId, troupeId2);
        })
        .then(function(didUpdate) {
          assert.strictEqual(didUpdate, true);
        });
    });

    it('should not update when the date is equal', function() {
      var userId = new ObjectID();
      var troupeId = new ObjectID();
      var lastAccessTime = new Date();
      var lastAccessTimeOld = new Date(lastAccessTime - 1000);

      return recentRoomCore.saveUserTroupeLastAccess(userId, troupeId, lastAccessTime)
        .then(function(didUpdate) {
          assert.strictEqual(didUpdate, true);
          return recentRoomCore.saveUserTroupeLastAccess(userId, troupeId, lastAccessTimeOld);
        })
        .then(function(didUpdate) {
          assert.strictEqual(didUpdate, false);
        });
    });
  })
});
