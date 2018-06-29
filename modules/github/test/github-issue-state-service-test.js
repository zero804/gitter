/* global describe:true, it:true */
"use strict";

var assert = require("assert");
var GitHubIssueStateService = require('..').GitHubIssueStateService;
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');

describe('github-issue-state-search #slow #github', function() {
  fixtureLoader.ensureIntegrationEnvironment('GITTER_INTEGRATION_USERNAME', 'GITTER_INTEGRATION_USER_SCOPE_TOKEN', 'GITTER_INTEGRATION_REPO_FULL');

  var FAKE_USER = {
    username: fixtureLoader.GITTER_INTEGRATION_USERNAME,
    githubToken: fixtureLoader.GITTER_INTEGRATION_USER_SCOPE_TOKEN
  };

  it('return the state', function(done) {
    var underTest = new GitHubIssueStateService(FAKE_USER);

    underTest.getIssueState(fixtureLoader.GITTER_INTEGRATION_REPO_FULL, 1)
      .then(function(f) {
        assert.strictEqual(f, 'open');
      })
      .nodeify(done);
  });

  it('return empty for missing issue', function(done) {
    var underTest = new GitHubIssueStateService(FAKE_USER);

    underTest.getIssueState(fixtureLoader.GITTER_INTEGRATION_REPO_FULL, 999999)
      .then(function(f) {
        assert.strictEqual(f, '');
      })
      .nodeify(done);
  });

});
