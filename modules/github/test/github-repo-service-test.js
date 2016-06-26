/*global describe:true, it:true */
"use strict";

var assert = require("assert");
var GitHubRepoService = require('..').GitHubRepoService;

var FAKE_USER = { username: 'gittertestbot', githubToken: '***REMOVED***'};

describe('github-repo-service #slow', function() {
  var ghRepo;


  beforeEach(function() {
    ghRepo = new GitHubRepoService(FAKE_USER);
  });

  it('should list the repos for a user', function() {
    return ghRepo.getReposForUser('suprememoocow')
      .then(function(repos) {
        assert(repos.length >= 1);
      });
  });

  it('should list the commits for a repo', function() {
    return ghRepo.getCommits('faye/faye', { firstPageOnly: true })
      .then(function(commits) {
        assert(commits.length >= 1);
      });
  });

});
