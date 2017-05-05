/* global describe:true, it:true */
"use strict";

var assert = require("assert");
var GitHubIssueStateService = require('..').GitHubIssueStateService;
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');

describe('github-issue-state-search #slow #github', function() {
  fixtureLoader.ensureIntegrationEnvironment('GITTER_INTEGRATION_USERNAME', 'GITTER_INTEGRATION_USER_SCOPE_TOKEN');

  var FAKE_USER = {
    username: fixtureLoader.GITTER_INTEGRATION_USERNAME,
    githubToken: fixtureLoader.GITTER_INTEGRATION_USER_SCOPE_TOKEN
  };

  it('return the state', function(done) {
    var underTest = new GitHubIssueStateService(FAKE_USER);

    underTest.getIssueState('gitterHQ/gitter', 1)
      .then(function(f) {
        assert.strictEqual(f, 'closed');
      })
      .nodeify(done);
  });

  it('return empty for missing issue', function(done) {
    var underTest = new GitHubIssueStateService(FAKE_USER);

    underTest.getIssueState('gitterHQ/gitter213123123', 1)
      .then(function(f) {
        assert.strictEqual(f, '');
      })
      .nodeify(done);
  });

});
