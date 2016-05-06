"use strict";

var assert = require('assert');
var RoomContextDelegate = require('../../lib/policies/room-context-delegate');
var fixtureLoader = require('../../../../test/integration/test-fixtures');

describe('room-context-delegate', function() {

  describe('integration tests #slow', function() {

    var fixture = {};

    before(fixtureLoader(fixture, {
      user1: {},
      user2: {},
      troupe1: {
        users: ['user1']
      }
    }));

    after(function() { fixture.cleanup(); });

    it('should work with users in the room', function() {
      var delegate = new RoomContextDelegate(fixture.troupe1._id);
      return delegate.isMember(fixture.user1._id)
        .then(function(result) {
          assert.strictEqual(result, true);
        });
    });

    it('should work with users not in the room', function() {
      var delegate = new RoomContextDelegate(fixture.troupe1._id);
      return delegate.isMember(fixture.user2._id)
        .then(function(result) {
          assert.strictEqual(result, false);
        });
    });

  });

});
