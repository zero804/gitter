/* jshint node:true, unused:strict */
/*global describe:true, it:true */
"use strict";

var testRequire     = require('../../test-require');
var assert          = require("assert");
var GithubMeService = testRequire('./services/github/github-me-service');

var FAKE_USER = { username: 'gittertestbot', githubToken: '64c1d90a8c60d2ee75fc5b3d3f7881d94559fec8'};

describe('github-me-service', function() {
  it('members should detailed emailed', function(done) {
    var gh = new GithubMeService(FAKE_USER);

    gh.getEmail()
      .then(function(email) {
        assert(email);
      })
      .nodeify(done);
  });




});