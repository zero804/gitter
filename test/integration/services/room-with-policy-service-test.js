"use strict";

var testRequire = require('../test-require');
var assert = require('assert');
var fixtureLoader = require('../test-fixtures');
var Promise = require('bluebird');
var StatusError = require('statuserror');

var RoomWithPolicyService = testRequire('./services/room-with-policy-service');

describe('room-with-policy-service', function() {
    var fixture = {};
    before(fixtureLoader(fixture, {
      user1: {
      },
      userStaff: {
        staff: true
      },
      troupe1: {
        users: ['user1']
      },
      troupeWithReservedTags: {
        tags: [
          'foo:bar',
          'foo'
        ]
      },
    }));

    after(function() { fixture.cleanup(); });

  var isAdminPolicy = {
    canAdmin: function() {
      return Promise.resolve(true);
    }
  };

  var notAdminPolicy = {
    canAdmin: function() {
      return Promise.resolve(false);
    }
  };

  it('should update tags', function() {
    var rawTags = 'js, open source,    looooooooooooooooooooooooooooongtag,,,,';
    var cleanTags = ['js','open source', 'looooooooooooooooooo'];
    var r = new RoomWithPolicyService(fixture.troupe1, fixture.user1, isAdminPolicy);
    return r.updateTags(rawTags)
      .then(function(troupe) {
        assert.deepEqual(troupe.tags.toObject(), cleanTags);
      });
  });

  it('should not save reserved-word tags(colons) with normal-user', function() {
    var rawTags = 'hey, foo:bar, there';
    var cleanTags = ['hey', 'there'];

    var r = new RoomWithPolicyService(fixture.troupe1, fixture.user1, isAdminPolicy);
    return r.updateTags(rawTags)
      .then(function(troupe) {
        assert.deepEqual(troupe.tags.toObject(), cleanTags);
      });
  });

  it('should deny a non-admin', function() {
    var rawTags = 'hey, foo:bar, there';

    var r = new RoomWithPolicyService(fixture.troupe1, fixture.user1, notAdminPolicy);
    return r.updateTags(rawTags)
      .then(function() {
        assert.ok(false);
      })
      .catch(StatusError, function(err) {
        assert.strictEqual(err.status, 403);
      });
  });

  it('should save reserved-word tags with staff-user', function() {
    var rawTags = 'hey, foo:bar, there';
    var cleanTags = ['hey', 'foo:bar', 'there'];

    var r = new RoomWithPolicyService(fixture.troupe1, fixture.userStaff, notAdminPolicy);
    return r.updateTags(rawTags)
      .then(function(troupe) {
        assert.deepEqual(troupe.tags.toObject(), cleanTags);
      });
  });

  it('should retain reserved-word tags with normal-user', function() {
    var fixtureTags = 'foo:bar, foo';
    var userTags = 'hey, there';
    var userActualTags = ['hey', 'there', 'foo:bar'];

    var r1 = new RoomWithPolicyService(fixture.troupeWithReservedTags, fixture.userStaff, notAdminPolicy);
    var r2 = new RoomWithPolicyService(fixture.troupeWithReservedTags, fixture.user1, isAdminPolicy);

    return r1.updateTags(fixtureTags)
      .then(function() {
        return r2.updateTags(userTags);
      })
      .then(function(troupe) {
        assert.deepEqual(troupe.tags.toObject(), userActualTags);
      });
  });
});
