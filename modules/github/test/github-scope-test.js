/*global describe:true, it:true */
"use strict";

var assert = require("assert");
var GithubMeService = require('..').GitHubMeService;
var GithubOrgService = require('..').GitHubOrgService;
var GithubRepoService = require('..').GitHubRepoService;

var scopeFixtures = require('./scope-fixtures');

function filterScopes(list) {
  var h = list.split(',').reduce(function(memo, value) {
    memo[value] = true;
    return memo;
  }, {});

  return function(f) {
    return h[f.scope];
  };
}

describe('github-scope-tests  #slow', function() {
  describe('email', function() {
    scopeFixtures.scopes.filter(filterScopes('user,user:email')).forEach(function(c) {
      var FAKE_USER = { username: c.username, githubToken: c.githubToken };

      it('should fetch emails: ' + c.scope, function(done) {
        var gh = new GithubMeService(FAKE_USER);

        gh.getEmail()
          .then(function(email) {
            assert(email);
          })
          .nodeify(done);
      });

    });
  });

  describe('concealed org membership', function() {

    scopeFixtures.scopes.filter(filterScopes('user,repo')).forEach(function(c) {
      var FAKE_USER = { username: c.username, githubToken: c.githubToken };

      it('should obtain membership status on a concealed org: ' + c.scope, function(done) {
        var gh = new GithubOrgService(FAKE_USER);

        gh.member('gittertestbotorg','gittertestbot')
          .then(function(isMember) {
            assert(isMember);
          })
          .nodeify(done);

      });

    });

  });

  describe('concealed org membership (read-only)', function() {

    scopeFixtures.scopes.filter(filterScopes('read:org')).forEach(function(c) {
      var FAKE_USER = { username: c.username, githubToken: c.githubToken };

      it('should obtain membership status on a concealed org: ' + c.scope, function(done) {
        var gh = new GithubOrgService(FAKE_USER);

        gh.member('gittertestbotorg','gittertestbot')
          .then(function(isMember) {
            assert(isMember);
          })
          .nodeify(done);

      });

    });

  });


  describe('private repo membership', function() {
    scopeFixtures.scopes.filter(filterScopes('repo')).forEach(function(c) {
      var FAKE_USER = { username: c.username, githubToken: c.githubToken };

      it('should fetch a private repo: ' + c.scope, function(done) {
        var gh = new GithubRepoService(FAKE_USER);

        gh.getRepo('troupe/gitter-webapp')
          .then(function(repo) {
            assert(repo);
          })
          .nodeify(done);

      });

    });


  });


});
