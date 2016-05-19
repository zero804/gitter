/* global describe:true, it:true */
"use strict";

var assert = require("assert");
var GitHubIssueService = require('..').GitHubIssueService;

var FAKE_USER = { username: 'gittertestbot', githubToken: '***REMOVED***'};

describe('github-issue-service #slow', function() {
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

    underTest.getIssue('troupe/gitter-webapp', 3)
      .then(function(f) {
        assert(f);
        assert.strictEqual(f.number, 3);
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
