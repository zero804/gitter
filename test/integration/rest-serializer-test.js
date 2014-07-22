"use strict";

var testRequire = require('./test-require');

var userService = testRequire('./services/user-service');
var restSerializer = testRequire('./serializers/rest-serializer');

var assert = require("assert");
var fixtureLoader = require('./test-fixtures');

var blockTimer = require('./block-timer');
before(blockTimer.on);
after(blockTimer.off);

describe('restSerializer', function() {

  var fixture = {};
  before(fixtureLoader(fixture, {
    user1: {},
    troupe1: {users: ['user1']}
  }));
  after(function() { fixture.cleanup(); });

  describe('#UserStrategy()', function() {

    var userStrategy = new restSerializer.UserStrategy();

    it('should serialize a user ', function(done) {
      var users = [fixture.user1];
      restSerializer.serialize(users, userStrategy, function(err, serialized) {
        if(err) return done(err);
        assert(serialized);
        done();
      });
    });

    it('should return the correct display name', function() {
      var mappedUser = userStrategy.map(fixture.user1);
      assert.equal(mappedUser.displayName, fixture.user1.displayName);
    });

  });

});
