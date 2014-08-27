/* jshint node:true, unused:strict */
/*global describe:true, it:true */
"use strict";

var testRequire     = require('../../test-require');
var assert          = require("assert");
var GithubContibutorService = testRequire('./services/github/github-contributor-service');

describe('github-me-service', function() {
  it('members should detailed emailed', function(done) {
    var gh = new GithubContibutorService(null);

    gh.getContributors('faye/faye')
      .then(function(contributors) {
        assert(contributors.indexOf('jcoglan') >= 0);
      })
      .nodeify(done);
  });




});
