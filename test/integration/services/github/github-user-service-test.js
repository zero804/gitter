"use strict";

var testRequire     = require('../../test-require');
var assert          = require("assert");
var GithubUserService = testRequire('./services/github/github-user-service');

var FAKE_USER = { username: 'gittertestbot', githubToken: '***REMOVED***'};

describe('github-user-service #slow', function() {
  it('getUser', function(done) {
    var gh = new GithubUserService(FAKE_USER);

    gh.getUser('suprememoocow')
      .then(function(user) {
        assert(user);
        assert.strictEqual(user.login, 'suprememoocow');
      })
      .nodeify(done);
  });

});
