"use strict";

var assert = require("assert");
var githubUriValidator = require('..').GitHubUriValidator;
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');

describe('github-user-service #slow #github', function() {
  fixtureLoader.ensureIntegrationEnvironment('GITTER_INTEGRATION_USERNAME', 'GITTER_INTEGRATION_USER_SCOPE_TOKEN');

  var FAKE_USER = {
    username: fixtureLoader.GITTER_INTEGRATION_USERNAME,
    githubToken: fixtureLoader.GITTER_INTEGRATION_USER_SCOPE_TOKEN
  };

  it('validate real org', function() {
    return githubUriValidator(FAKE_USER, 'gitterHQ')
      .then(function(result) {
        assert(result);
        assert.strictEqual(result.type, 'ORG');
        assert.strictEqual(result.uri, 'gitterHQ');
        assert.strictEqual(result.githubId, 5990364);
      });
  });

  it('validate real user', function() {
    return githubUriValidator(FAKE_USER, 'suprememoocow')
      .then(function(result) {
        assert.deepEqual(result, {
          description: 'Andrew Newdigate',
          githubId: 594566,
          type: 'USER',
          uri: 'suprememoocow'
        });
      });
  });

  it('validate real repo', function() {
    return githubUriValidator(FAKE_USER, 'gitterHQ/gitter')
      .then(function(result) {
        assert(result);
        assert.strictEqual(result.type, 'REPO');
        assert.strictEqual(result.uri, 'gitterHQ/gitter');
        assert.strictEqual(result.githubId, 14863998);
      });
  });

  it('validate nonexistant org', function() {
    return githubUriValidator(FAKE_USER, 'gitterHQskldjlsadkjasd')
      .then(function(result) {
        assert(!result);
      });
  });

  it('validate nonexistant repo', function() {
    return githubUriValidator(FAKE_USER, 'gitterHQskldjlsadkjasd/dklasjdsa')
      .then(function(result) {
        assert(!result);
      });
  });

});
