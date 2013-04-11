/*jslint node: true */
/*global describe:true, it: true */
"use strict";

var testRequire = require('./test-require');

var userService = testRequire('./services/user-service');
var restSerializer = testRequire('./serializers/rest-serializer');

var assert = require("better-assert");

describe('restSerializer', function() {
  describe('#UserIdStrategy()', function() {
    it('should return Oral for 50,50', function(done) {
      userService.findByEmail('testuser@troupetest.local', function(err, user) {
        if(err) done(err);
        if(!user) done("Cannot find user testuser@troupetest.local, have you run your data upgrade scripts?");

        var strategy = new restSerializer.UserStrategy();
        var users = [user];
        restSerializer.serialize(users, strategy, function(err, serialized) {
          if(err) return done(err);
          done();
        });
      });

    });

  });
});
