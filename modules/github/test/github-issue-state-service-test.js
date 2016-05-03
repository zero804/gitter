/* global describe:true, it:true */
"use strict";

var assert = require("assert");
var GitHubIssueStateService = require('..').GitHubIssueStateService;

var FAKE_USER = { username: 'gittertestbot', githubToken: '***REMOVED***'};

describe('github-issue-state-search #slow', function() {
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
