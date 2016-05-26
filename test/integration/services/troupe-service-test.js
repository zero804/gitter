"use strict";


var testRequire = require('../test-require');
var fixtureLoader = require('../test-fixtures');
var assert = require("assert");
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var fixture = {};

describe('troupe-service', function() {

  describe('#findByIdLeanWithMembership', function() {
    var troupeService = testRequire('./services/troupe-service');

    it('should find a room which exists and the user has access', function(done) {
      troupeService.findByIdLeanWithMembership(fixture.troupe1.id, fixture.user1.id)
        .spread(function(room, access) {
          assert.strictEqual(room.id, fixture.troupe1.id);
          assert.strictEqual(access, true);
        })
        .nodeify(done);
    });

    it('should find a room which exists and the does not have access', function(done) {
      troupeService.findByIdLeanWithMembership(fixture.troupe2.id, fixture.user1.id)
        .spread(function(room, access) {
          assert(room);
          assert.strictEqual(room.id, fixture.troupe2.id);
          assert.strictEqual(access, false);
        })
        .nodeify(done);

    });

    it('should not find a room which does not exist, for a user', function(done) {
      troupeService.findByIdLeanWithMembership(mongoUtils.getNewObjectIdString(), fixture.user1.id)
        .spread(function(room, access) {
          assert(!room);
          assert(!access);
        })
        .nodeify(done);
    });

    it('should find a room which exists and for anon', function(done) {
      troupeService.findByIdLeanWithMembership(fixture.troupe2.id, null)
        .spread(function(room, access) {
          assert(room);
          assert(!access);
        })
        .nodeify(done);
    });

    it('should not find a room which does not exist for anon', function(done) {
      troupeService.findByIdLeanWithMembership(mongoUtils.getNewObjectIdString(), null)
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
    troupe1: {
      users: ['user1', 'user2']
    },
    troupe2: {
    },
  }));

  after(function() { fixture.cleanup(); });

});
