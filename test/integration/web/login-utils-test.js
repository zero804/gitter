/*jslint node: true */
/*global describe:true, it: true, before:true, afterEach:true */
"use strict";

var testRequire = require('../test-require');
var assert = require('assert');

var loginUtils = testRequire('./web/login-utils');
var persistence = testRequire('./services/persistence-service');
var fixtureLoader = require('../test-fixtures');
var fixture = {};

var assert = require('assert');

describe('login-utils', function() {
	describe('#whereToNext', function(done) {

    it('should return a username url if the user is in not in any troupes and has no username', function() {
      return loginUtils.whereToNext(fixture.user3)
        .then(function(url) {
          assert(url.indexOf(fixture.user3.username) == 1,'URL should contain username');
          assert.equal(url, fixture.user3.getHomeUrl());
        })
        .nodeify(done);
    });


    it('should return a troupe if the user is a member', function() {
      return loginUtils.whereToNext(fixture.user1)
        .then(function(url) {
          assert.equal(url, '/' + fixture.troupe1.uri);
        })
        .nodeify(done);
    });
	});

  before(fixtureLoader(fixture, {
    troupe1: { users: 'user1' },
    user2: { },
    user3: { username: true }

  }));

});

