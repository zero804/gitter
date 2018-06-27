/* global describe:true, it:true */
"use strict";

var assert = require("assert");
var GitHubIssueService = require('..').GitHubIssueService;
var GitHubRepoService = require('..').GitHubRepoService;
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');


describe('github-issue-service #slow #github', function() {
  fixtureLoader.ensureIntegrationEnvironment('GITTER_INTEGRATION_USERNAME', 'GITTER_INTEGRATION_REPO_SCOPE_TOKEN', 'GITTER_INTEGRATION_REPO_FULL');

  var FAKE_USER = {
    username: fixtureLoader.GITTER_INTEGRATION_USERNAME,
    githubToken: fixtureLoader.GITTER_INTEGRATION_REPO_SCOPE_TOKEN
  };

  it('return the state', function(done) {
    var repoService = new GitHubRepoService(FAKE_USER);
    var underTest = new GitHubIssueService(FAKE_USER);

    repoService.getRepo(fixtureLoader.GITTER_INTEGRATION_REPO_FULL)
      .then((repo) => {
        assert.strictEqual(repo.private, false);
      })
      .then(() => underTest.getIssue(fixtureLoader.GITTER_INTEGRATION_REPO_FULL, 1))
      .then(function(f) {
        assert(f);
        assert.strictEqual(f.number, 1);
      })
      .nodeify(done);
  });

  // FIXME: This is commented out because we don't have a private repo to test against (private repos cost money)
  it('return the state for a private repo'/*, function(done) {
    var repoService = new GitHubRepoService(FAKE_USER);
    var underTest = new GitHubIssueService(FAKE_USER);

    repoService.getRepo(fixtureLoader.GITTER_INTEGRATION_REPO_FULL)
      .then((repo) => {
        assert.strictEqual(repo.private, true);
      })
      .then(() => underTest.getIssue(fixtureLoader.GITTER_INTEGRATION_REPO_FULL, 1))
      .then(function(f) {
        assert(f);
        assert.strictEqual(f.number, 1);
      })
      .nodeify(done);
  }*/);

  it('return empty for missing issue', function(done) {
    var repoService = new GitHubRepoService(FAKE_USER);
    var underTest = new GitHubIssueService(FAKE_USER);

    repoService.getRepo(fixtureLoader.GITTER_INTEGRATION_REPO_FULL)
      .then((repo) => {
        assert.strictEqual(repo.private, false);
      })
      .then(() => underTest.getIssue(fixtureLoader.GITTER_INTEGRATION_REPO_FULL, 999999))
      .then(function(f) {
        assert.strictEqual(f, null);
      })
      .nodeify(done);
  });

  it('return the state for an anonymous user', function(done) {
    var repoService = new GitHubRepoService();
    var underTest = new GitHubIssueService();

    repoService.getRepo(fixtureLoader.GITTER_INTEGRATION_REPO_FULL)
      .then((repo) => {
        assert.strictEqual(repo.private, false);
      })
      .then(() => underTest.getIssue(fixtureLoader.GITTER_INTEGRATION_REPO_FULL, 1))
      .then(function(f) {
        assert(f);
        assert.strictEqual(f.number, 1);
      })
      .nodeify(done);
  });

});
