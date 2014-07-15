/*jshint globalstrict:true, trailing:false, unused:true, node:true */
/*global describe:true, it:true, before:true, after:true */
"use strict";

var testRequire        = require('./../test-require');
var fixtureLoader      = require('../test-fixtures');
var persistenceService = testRequire('./services/persistence-service');
var userService        = testRequire('./services/user-service');
var assert             = testRequire("assert");
var Q                  = require('q');

var fixture = {};
var fixture2 = {};

describe("User Service", function() {

  before(fixtureLoader(fixture2, {
    user1: { username: true },
    user2: { }
  }));

  before(fixtureLoader(fixture));


  it('should allow two users with the same githubId to be created at the same moment, but only create a single account', function(done) {
    var userService = testRequire("./services/user-service");

    var githubId = fixture2.generateGithubId();
    Q.all([
      userService.findOrCreateUserForGithubId({ githubId: githubId, username: fixture2.generateUsername(), githubToken: fixture2.generateGithubToken() }),
      userService.findOrCreateUserForGithubId({ githubId: githubId, username: fixture2.generateUsername(), githubToken: fixture2.generateGithubToken() })
      ])
      .spread(function(user1, user2) {
        assert.strictEqual(user1.id, user2.id);
        assert.strictEqual(user1.confirmationCode, user2.confirmationCode);
      })
      .nodeify(done);
  });

  it('should be able to invite a user using his username', function(done) {
    var userService = testRequire("./services/user-service");

    userService.inviteByUsername('node-gitter')
    .then(function(user) {
      assert.equal(user.username,'node-gitter');
    })
    .nodeify(done);
  });




  after(function() {
    fixture.cleanup();
    fixture2.cleanup();
  });
});
