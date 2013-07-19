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

      var user = {
        displayName: 'Test Testerson',
        email: 't.testerson@testcorp.com',
        location: {},
        getHomeUrl: function(){}
      };

      var mappedUser = userStrategy.map(user);

      assert.equal(mappedUser.displayName, 'Test Testerson');
    });

    it('should return the email username if the displyname hasnt been set', function() {

      var user = {
        displayName: '',
        email: 't.testerson@testcorp.com',
        location: {},
        getHomeUrl: function(){}
      };

      var mappedUser = userStrategy.map(user);

      assert.equal(mappedUser.displayName, 't.testerson');
    });

    it('should return the full email address if the displyname hasnt been set and the address is weird', function() {

      var user = {
        displayName: '',
        email: 'whatisthisdotcom',
        location: {},
        getHomeUrl: function(){}
      };

      var mappedUser = userStrategy.map(user);

      assert.equal(mappedUser.displayName, 'whatisthisdotcom');
    });

  });

  before(fixtureLoader(fixture));

});
