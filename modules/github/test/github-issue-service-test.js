/* global describe:true, it:true */
"use strict";

var assert = require("assert");
var GitHubIssueService = require('..').GitHubIssueService;
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');


describe('github-issue-service #slow #github', function() {
  fixtureLoader.ensureIntegrationEnvironment('GITTER_INTEGRATION_USERNAME', 'GITTER_INTEGRATION_REPO_SCOPE_TOKEN', 'GITTER_INTEGRATION_REPO_FULL');

  var FAKE_USER = {
    username: fixtureLoader.GITTER_INTEGRATION_USERNAME,
    githubToken: fixtureLoader.GITTER_INTEGRATION_REPO_SCOPE_TOKEN
  };

  it('return the state', function(done) {
    var underTest = new GitHubIssueService(FAKE_USER);

    underTest.getIssue('gitterHQ/gitter', 3)
      .then(function(f) {
        assert(f);
        assert.strictEqual(f.number, 3);
      })
      .nodeify(done);
  });

  it('return the state for a private repo', function(done) {
    var underTest = new GitHubIssueService(FAKE_USER);
    underTest.getIssue(fixtureLoader.GITTER_INTEGRATION_REPO_FULL, 1)
      .then(function(f) {
        assert(f);
        assert.strictEqual(f.number, 1);
      })
      .nodeify(done);
  });

  it('return empty for missing issue', function(done) {
    var underTest = new GitHubIssueService(FAKE_USER);

    underTest.getIssue('gitterHQ/gitter213123123', 1)
      .then(function(f) {
        assert.strictEqual(f, null);
      })
      .nodeify(done);
  });

  it('return the state for an anonymous user', function(done) {
    var underTest = new GitHubIssueService();

    underTest.getIssue('gitterHQ/gitter', 3)
      .then(function(f) {
        assert(f);
        assert.strictEqual(f.number, 3);
      })
      .nodeify(done);
  });

});
