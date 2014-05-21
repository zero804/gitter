/*jslint node:true, unused:true*/
/*global describe:true, it:true, before:true, after: true */
"use strict";

var testRequire = require('../test-require');
var assert = require('assert');
var FAKE_USER = { username: 'gittertestbot', githubToken: '8e8ec7658e8a3bc645cfbff9aa5d168131844f36'};

var repoService = testRequire("./services/repo-service");

describe('repoService', function() {
  it('should fetch suggestedReposForUser', function(done) {
    return repoService.suggestedReposForUser(FAKE_USER)
      .then(function(repos) {
        assert(repos);
      })
      .nodeify(done);
  });
});