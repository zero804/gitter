/*global describe:true, it:true */
"use strict";

var assert         = require("assert");
var GithubOrgService = require('..').GitHubOrgService;
var GITTER_TEST_BOT = { username: 'gittertestbot', githubToken: '***REMOVED***'};

describe('github-org-service #slow', function() {

  describe('members', function() {

    it('should fetch members', function(done) {
      var gh = new GithubOrgService(GITTER_TEST_BOT);

      gh.members('gitterHQ')
        .then(function(members) {
          assert(members.length >= 1);
        })
        .nodeify(done);
    });

    it('should return true if a user checks that it is in an org', function(done) {
      var gh = new GithubOrgService(GITTER_TEST_BOT);

      gh.member('gitterHQ', 'gittertestbot')
        .then(function(isMember) {
          assert(isMember);
        })
        .nodeify(done);
    });

    it('should return true if a user checks that another member is in an org', function(done) {
      var gh = new GithubOrgService(GITTER_TEST_BOT);

      gh.member('gitterHQ', 'mydigitalself')
        .then(function(isMember) {
          assert(isMember);
        })
        .nodeify(done);
    });

    it('should return false if a user checks that it is in an org that it is not a member of', function(done) {
      var gh = new GithubOrgService(GITTER_TEST_BOT);

      gh.member('adobe', 'gittertestbot')
        .then(function(isMember) {
          assert(!isMember);
        })
        .nodeify(done);
    });

    it('should return false if a user checks that a stranger is in the users org', function(done) {
      var gh = new GithubOrgService(GITTER_TEST_BOT);

      gh.member('gitterHQ', 'indexzero')
        .then(function(isMember) {
          assert(!isMember);
        })
        .nodeify(done);
    });

    it('should return membership information for an org', function(done) {
      var gh = new GithubOrgService(GITTER_TEST_BOT);

      gh.getMembership('gitterTest', 'gittertestbot')
        .then(function(membership) {
          assert('gitterTest', membership.organization.login);
          assert('gittertestbot', membership.user.login);
        })
        .nodeify(done);
    });


  });

});
