'use strict';

var StatusError = require('statuserror');
var assert = require("assert");
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var groupUriChecker = require('../lib/group-uri-checker');


describe('group-uri-checker #slow', function() {
  var fixture = fixtureLoader.setup({
    deleteDocuments: {
      User: [{ username: fixtureLoader.GITTER_INTEGRATION_USERNAME }],
      Troupe: [ { lcUri: fixtureLoader.GITTER_INTEGRATION_ORG.toLowerCase() } ],
      Group: [
        { lcUri: fixtureLoader.GITTER_INTEGRATION_ORG.toLowerCase() },
        { lcUri: fixtureLoader.GITTER_INTEGRATION_USERNAME.toLowerCase() }
      ]
    },
    user1: {
      githubToken: fixtureLoader.GITTER_INTEGRATION_USER_SCOPE_TOKEN,
      username: fixtureLoader.GITTER_INTEGRATION_USERNAME
    },
    group1: {},
    troupe1: {}
  });

  it('should throw an error if you pass in an invalid group uri', function() {
    return groupUriChecker(fixture.user1, 'about')
      .then(function() {
        assert.ok(false, 'Error expected');
      })
      .catch(StatusError, function(err) {
        assert.strictEqual(err.status, 400);
      });
  });

  // see group-uri-checker.js. This check was disabled for now.
  /*
  it('should not allow creation if a gitter user with that username exists', function() {
    return groupUriChecker(fixture.user1, fixture.user1.username)
      .then(function(info) {
        assert.strictEqual(info.allowCreate, false);
      });
  });
  */

  it('should not allow creation if a group with that uri exists', function() {
    return groupUriChecker(fixture.user1, fixture.group1.uri)
      .then(function(info) {
        assert.strictEqual(info.allowCreate, false);
      });
  });

  it('should allow creation if a gh org with that login exists and the user has admin access', function() {
    return groupUriChecker(fixture.user1, fixtureLoader.GITTER_INTEGRATION_ORG)
      .then(function(info) {
        assert.strictEqual(info.type, 'GH_ORG');
        assert.strictEqual(info.allowCreate, true);
      });
  });


  it('should allow creation if the uri is not taken in any way', function() {
    return groupUriChecker(fixture.user1, '_this-should-not-exist')
      .then(function(info) {
        assert.strictEqual(info.type, null);
        assert.strictEqual(info.allowCreate, true);
      });
  });


  it("should allow creation if a gh user with that login exists and you are that user ", function() {
    return groupUriChecker(fixture.user1, fixtureLoader.GITTER_INTEGRATION_USERNAME)
      .then(function(info) {
        assert.strictEqual(info.allowCreate, true);
      });
  });

  it("should not allow creation if a gh user with that login exists and you are not that user", function() {
    return groupUriChecker(fixture.user2, fixtureLoader.GITTER_INTEGRATION_USERNAME)
      .then(function(info) {
        assert.strictEqual(info.allowCreate, false);
      });
  });
});
