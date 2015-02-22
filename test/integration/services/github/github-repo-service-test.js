/* jshint node:true, unused:strict */
/*global describe:true, it:true */
"use strict";

var testRequire     = require('../../test-require');
var assert          = require("assert");
var GithubMeService = testRequire('./services/github/github-repo-service');

var FAKE_USER = { username: 'gittertestbot', githubToken: '***REMOVED***'};

describe('github-repo-service #slow', function() {
  var ghRepo;


  beforeEach(function() {
    ghRepo = new GithubMeService(FAKE_USER);
  });

  it('should list the repos for a user', function(done) {
    ghRepo.getReposForUser('suprememoocow')
      .then(function(repos) {
        assert(repos.length >= 1);
      })
      .nodeify(done);
  });

});
