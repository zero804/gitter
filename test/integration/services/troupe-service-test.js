/*jslint node:true, unused:true*/
/*global describe:true, it:true, before:true, after:false */
"use strict";


var testRequire   = require('../test-require');
var fixtureLoader = require('../test-fixtures');
var Promise       = require('bluebird');
var _             = require('underscore');
var assert        = require("assert");
var mongoUtils    = require('gitter-web-persistence-utils/lib/mongo-utils');
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

    it('should update tags', function() {
      var rawTags = 'js, open source,    looooooooooooooooooooooooooooongtag,,,,';
      var cleanTags = ['js','open source', 'looooooooooooooooooo'];

      return troupeService.updateTags(fixture.user1, fixture.troupe1, rawTags)
        .then(function(troupe) {
          assert.deepEqual(troupe.tags.toObject(), cleanTags);
        });
    });

    it('should not save reserved-word tags(colons) with normal-user', function() {
      var rawTags = 'hey, foo:bar, there';
      var cleanTags = ['hey', 'there'];

      return troupeService.updateTags(fixture.user1, fixture.troupe1, rawTags)
        .then(function(troupe) {
          assert.deepEqual(troupe.tags.toObject(), cleanTags);
        });
    });

    it('should save reserved-word tags with staff-user', function() {
      var rawTags = 'hey, foo:bar, there';
      var cleanTags = ['hey', 'foo:bar', 'there'];

      return troupeService.updateTags(fixture.userStaff, fixture.troupe1, rawTags)
        .then(function(troupe) {
          assert.deepEqual(troupe.tags.toObject(), cleanTags);
        });
    });

    it('should retain reserved-word tags with normal-user', function() {
      var fixtureTags = 'foo:bar, foo';
      var userTags = 'hey, there';
      var userActualTags = ['hey', 'there', 'foo:bar'];

      return troupeService.updateTags(fixture.userStaff, fixture.troupeWithReservedTags, fixtureTags)
        .then(function() {
          return troupeService.updateTags(fixture.user1, fixture.troupeWithReservedTags, userTags);
        })
        .then(function(troupe) {
          assert.deepEqual(troupe.tags.toObject(), userActualTags);
        });
    });
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
    userStaff: {
      staff: true
    },
    troupe1: {
      users: ['user1', 'user2']
    },
    troupe2: {
    },
    troupe3: {
    },
    troupeWithReservedTags: {
      tags: [
        'foo:bar',
        'foo'
      ]
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
