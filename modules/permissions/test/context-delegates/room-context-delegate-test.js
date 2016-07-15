"use strict";

var assert = require('assert');
var RoomContextDelegate = require('../../lib/context-delegates/room-context-delegate');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');

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
      var delegate = new RoomContextDelegate(fixture.user1._id, fixture.troupe1._id);
      return delegate.isMember()
        .then(function(result) {
          assert.strictEqual(result, true);
        });
    });

    it('should work with users not in the room', function() {
      var delegate = new RoomContextDelegate(fixture.user2._id, fixture.troupe1._id);
      return delegate.isMember()
        .then(function(result) {
          assert.strictEqual(result, false);
        });
    });

  });

});
