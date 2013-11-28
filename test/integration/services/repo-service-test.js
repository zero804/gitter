/*jslint node:true, unused:true*/
/*global describe:true, it:true, before:true, after: true */
"use strict";

var testRequire = require('../test-require');
var assert = require('assert');
var FAKE_USER = { username: 'gittertestbot', githubToken: '8f48ba63dc9dfe4225440ad50e3349d275c619ac'};

var repoService = testRequire("./services/repo-service");

describe('repoService', function() {
  it('should fetch suggestedReposForUser', function(done) {
    return repoService.suggestedReposForUser(FAKE_USER)
      .then(function(repos) {
        console.log(repos);
      })
      .nodeify(done);
  });
});