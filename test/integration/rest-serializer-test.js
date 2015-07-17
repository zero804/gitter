"use strict";

var testRequire = require('./test-require');

var userService = testRequire('./services/user-service');
var restSerializer = testRequire('./serializers/rest-serializer');

var assert = require("assert");
var fixtureLoader = require('./test-fixtures');


describe('restSerializer', function() {

  var blockTimer = require('./block-timer');
  before(blockTimer.on);
  after(blockTimer.off);

  var fixture = {};
  before(fixtureLoader(fixture, {
    user1: {},
    troupe1: {users: ['user1']}
  }));
  after(function() { fixture.cleanup(); });

  describe('#UserStrategy()', function() {


    it('should serialize a user ', function(done) {
      var users = [fixture.user1];
      var userStrategy = new restSerializer.UserStrategy();

      restSerializer.serialize(users, userStrategy, function(err, serialized) {
        if(err) return done(err);
        assert(serialized);
        done();
      });
    });

    it('should return the correct display name', function() {
      var userStrategy = new restSerializer.UserStrategy();
      var mappedUser = userStrategy.map(fixture.user1);
      assert.equal(mappedUser.displayName, fixture.user1.displayName);
    });

    it('should return when no items are serialized with promises', function(done) {
      var userStrategy = new restSerializer.UserStrategy();

      restSerializer.serialize([], userStrategy)
        .then(function(results) {
          assert.deepEqual(results, []);
        })
        .nodeify(done);
    });

    it('should return when no items are serialized with callbacks', function(done) {
      var userStrategy = new restSerializer.UserStrategy();

      restSerializer.serialize([], userStrategy, function(err, results) {
        if (err) return done(err);
        assert.deepEqual(results, []);
        done();
      });
    });

    it('should return when a null item is serialized with promises', function(done) {
      var userStrategy = new restSerializer.UserStrategy();

      restSerializer.serialize(null, userStrategy)
        .then(function(results) {
          assert.strictEqual(results, null);
        })
        .nodeify(done);
    });

    it('should return when a null item is serialized with callbacks', function(done) {
      var userStrategy = new restSerializer.UserStrategy();

      restSerializer.serialize(null, userStrategy, function(err, results) {
        if (err) return done(err);
        assert.strictEqual(results, null);
        done();
      });
    });

  });

});
