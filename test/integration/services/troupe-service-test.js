/*jslint node:true, unused:true*/
/*global describe:true, it:true, before:true, after:false */
"use strict";


var testRequire   = require('../test-require');
var fixtureLoader = require('../test-fixtures');
var Promise       = require('bluebird');
var _             = require('underscore');
var assert        = require("assert");
var mongoUtils    = testRequire("./utils/mongo-utils");
var fixture       = {};

function findUserIdPredicate(userId) {
  return function(x) {
    return "" + x === "" + userId;
  };
}
describe('troupe-service', function() {

  describe('update actions', function() {
    var troupeService = testRequire.withProxies('./services/troupe-service', {
      './room-permissions-model': function() { return Promise.resolve(true); }
    });

    it('should update tags', function(done) {
      var rawTags = 'js, open source,    looooooooooooooooooooooooooooongtag,,,,';
      var cleanTags = ['js','open source', 'looooooooooooooooooo'];

      troupeService.updateTags(fixture.user1, fixture.troupe1, rawTags)
      .then(function(troupe) {
        assert.deepEqual(troupe.tags.toObject(), cleanTags);
        done();
      })
      .catch(done);
    });
  });

  describe('oneToOnes #slow', function() {
    var troupeService = testRequire('./services/troupe-service');
    var roomMembershipService = testRequire('./services/room-membership-service');

    it('should handle the creation of a oneToOneTroupe single', function(done) {
      troupeService.findOrCreateOneToOneTroupeIfPossible(fixture.user1.id, fixture.user2.id)
        .spread(function(troupe, otherUser) {
          assert(troupe);
          assert(troupe.oneToOne);
          assert.strictEqual(troupe.githubType, 'ONETOONE');
          assert.strictEqual(otherUser.id, fixture.user2.id);
          assert.strictEqual(troupe.oneToOneUsers.length, 2);

          return roomMembershipService.findMembersForRoom(troupe.id);
        })
        .then(function(userIds) {
          assert(_.find(userIds, findUserIdPredicate(fixture.user1.id)));
          assert(_.find(userIds, findUserIdPredicate(fixture.user2.id)));
        })
        .nodeify(done);
    });

    it('should handle the creation of a oneToOneTroupe atomicly', function(done) {
      Promise.all([
          troupeService.findOrCreateOneToOneTroupeIfPossible(fixture.user2.id, fixture.user3.id),
          troupeService.findOrCreateOneToOneTroupeIfPossible(fixture.user3.id, fixture.user2.id)
        ])
        .spread(function(r1, r2) {
          var troupe1 = r1[0];
          var otherUser1 = r1[1];
          var troupe2 = r2[0];
          var otherUser2 = r2[1];

          assert(troupe1);
          assert(troupe1.oneToOne);
          assert.strictEqual(troupe1.githubType, 'ONETOONE');
          assert.strictEqual(troupe1.oneToOneUsers.length, 2);
          assert.strictEqual(otherUser1.id, fixture.user3.id);

          assert(troupe2);
          assert(troupe2.oneToOne);
          assert.strictEqual(troupe2.githubType, 'ONETOONE');
          assert.strictEqual(troupe2.oneToOneUsers.length, 2);
          assert.strictEqual(otherUser2.id, fixture.user2.id);

          assert.strictEqual(troupe1.id, troupe2.id);

          return roomMembershipService.findMembersForRoom(troupe1.id);
        })
        .then(function(userIds) {
          assert(_.find(userIds, findUserIdPredicate(fixture.user2.id)));
          assert(_.find(userIds, findUserIdPredicate(fixture.user3.id)));
        })
        .nodeify(done);
    });

  });

  describe('#createNewTroupeForExistingUser', function() {



    // xit('should handle the creation of a new troupe', function(done) {

    //   var name = 'Test Troupe for Existing user ' + new Date();

    //   return troupeService.createNewTroupeForExistingUser({
    //     user: fixture.user1,
    //     name: name
    //   }).then(function(newTroupe) {
    //     if(!newTroupe) return done('New troupe not created');

    //     assert(newTroupe.name === name, 'New Troupe name is wrong');

    //     assert(troupeService.userIdHasAccessToTroupe(fixture.user1.id, newTroupe), 'User1 is supposed to be in the new troupe');
    //   })
    //   .nodeify(done);

    // });

  });

  describe('#findByIdLeanWithAccess', function() {
    var troupeService = testRequire('./services/troupe-service');

    it('should find a room which exists and the user has access', function(done) {
      troupeService.findByIdLeanWithAccess(fixture.troupe1.id, fixture.user1.id)
        .spread(function(room, access) {
          assert.strictEqual(room.id, fixture.troupe1.id);
          assert.strictEqual(access, true);
        })
        .nodeify(done);
    });

    it('should find a room which exists and the does not have access', function(done) {
      troupeService.findByIdLeanWithAccess(fixture.troupe2.id, fixture.user1.id)
        .spread(function(room, access) {
          assert(room);
          assert.strictEqual(room.id, fixture.troupe2.id);
          assert.strictEqual(access, false);
        })
        .nodeify(done);

    });

    it('should not find a room which does not exist, for a user', function(done) {
      troupeService.findByIdLeanWithAccess(mongoUtils.getNewObjectIdString(), fixture.user1.id)
        .spread(function(room, access) {
          assert(!room);
          assert(!access);
        })
        .nodeify(done);
    });

    it('should find a room which exists and for anon', function(done) {
      troupeService.findByIdLeanWithAccess(fixture.troupe2.id, null)
        .spread(function(room, access) {
          assert(room);
          assert(!access);
        })
        .nodeify(done);
    });

    it('should not find a room which does not exist for anon', function(done) {
      troupeService.findByIdLeanWithAccess(mongoUtils.getNewObjectIdString(), null)
        .spread(function(room, access) {
          assert(!room);
          assert(!access);
        })
        .nodeify(done);
    });
  });

  before(fixtureLoader(fixture, {
    user1: {
    },
    user2: {
    },
    user3: {
    },
    userNoTroupes: {
    },
    troupe1: {
      users: ['user1', 'user2']
    },
    troupe2: {
    },
    troupe3: {
    },
    troupeForDeletion: {
      users: ['user1', 'user2']
    },
    troupeForDeletion2: {
      users: ['user1']
    },
    troupeForDeletion3: {
      users: ['user1', 'user2']
    }

  }));
  after(function() { fixture.cleanup(); });

});
