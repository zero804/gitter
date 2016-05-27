"use strict";

var assert = require('assert');
var OneToOneRoomContextDelegate = require('../../lib/policies/one-to-one-room-context-delegate');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');

describe('one-to-one-room-context-delegate', function() {

  describe('integration tests #slow', function() {

    var fixture = {};

    before(fixtureLoader(fixture, {
      user1: {},
      user2: {},
      user3: {},
      troupeOneToOne: {
        oneToOne: true,
        users: ['user1','user2']
      },
      troupe1: {
        users: ['user1']
      }
    }));

    after(function() { fixture.cleanup(); });

    it('should work with users in the room', function() {
      var delegate = new OneToOneRoomContextDelegate(fixture.troupeOneToOne._id);
      return delegate.isMember(fixture.user1._id)
        .then(function(result) {
          assert.strictEqual(result, true);
        });
    });

    it('should work with users not in the room', function() {
      var delegate = new OneToOneRoomContextDelegate(fixture.troupeOneToOne._id);
      return delegate.isMember(fixture.user3._id)
        .then(function(result) {
          assert.strictEqual(result, false);
        });
    });

    it('should not work in non-one-to-one-rooms', function() {
      var delegate = new OneToOneRoomContextDelegate(fixture.troupe1._id);
      return delegate.isMember(fixture.user1._id)
        .then(function(result) {
          assert.strictEqual(result, false);
        });
    });

  });

});
