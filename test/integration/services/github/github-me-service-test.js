/* jshint node:true, unused:strict */
/*global describe:true, it:true */
"use strict";

var testRequire     = require('../../test-require');
var assert          = require("assert");
var GithubMeService = testRequire('./services/github/github-me-service');

var FAKE_USER = { username: 'gittertestbot', githubToken: '***REMOVED***'};

describe('github-me-service #slow', function() {
  it('members should detailed emailed', function(done) {
    var gh = new GithubMeService(FAKE_USER);

    gh.getEmail()
      .then(function(email) {
        assert(email);
      })
      .nodeify(done);
  });




});
