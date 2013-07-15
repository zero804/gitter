/*jslint node: true */
/*global describe:true, it: true, before:false */
"use strict";

var testRequire = require('./test-require');

var userService = testRequire('./services/user-service');
var restSerializer = testRequire('./serializers/rest-serializer');

var assert = require("assert");
var fixtureLoader = require('./test-fixtures');

var fixture = {};

describe('restSerializer', function() {
  describe('#UserIdStrategy()', function() {
    it('should serialize a user ', function(done) {

      var strategy = new restSerializer.UserStrategy();
      var users = [fixture.user1];
      restSerializer.serialize(users, strategy, function(err, serialized) {
        if(err) return done(err);
        assert(serialized);
        done();
      });

    });

  });

  before(fixtureLoader(fixture));

});
