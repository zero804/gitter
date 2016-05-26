/*global describe:true, it:true */
"use strict";

var assert = require("assert");
var GithubMeService = require('..').GitHubMeService;

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

  describe('test org admin status', function() {

    it('should return true if the user is an admin', function(done) {
      var gh = new GithubMeService(FAKE_USER);

      gh.isOrgAdmin('gitterTest')
        .then(function(isAdmin) {
          assert(isAdmin);
        })
        .nodeify(done);
    });

    it('should return false if the user is not an admin', function(done) {
      var gh = new GithubMeService(FAKE_USER);

      gh.isOrgAdmin('gitterHQ')
        .then(function(isAdmin) {
          assert(!isAdmin);
        })
        .nodeify(done);
    });

    it('should return false if the org does not exist', function(done) {
      var gh = new GithubMeService(FAKE_USER);

      gh.isOrgAdmin('gitterHQTestingDoesNotExistOkay')
        .then(function(isAdmin) {
          assert(!isAdmin);
        })
        .nodeify(done);
    });

  });


  it('should return that you are and org admin when you are', function(done) {
    var gh = new GithubMeService(FAKE_USER);

    gh.isOrgAdmin('gitterTest')
      .then(function(isOrgMember) {
        assert(isOrgMember);
      })
      .nodeify(done);

  });

  it('should return that you are and org member when you are', function(done) {
    var gh = new GithubMeService(FAKE_USER);

    gh.isOrgMember('gitterTest')
      .then(function(isOrgMember) {
        assert(isOrgMember);
      })
      .nodeify(done);

  });

  it('should return org membership', function(done) {
    var gh = new GithubMeService(FAKE_USER);

    gh.getOrgMembership('gitterTest')
      .then(function(membership) {
        assert('gitterTest', membership.organization.login);
        assert('gittertestbot', membership.user.login);
      })
      .nodeify(done);

  });

  it('should list all orgs the user is a member of', function(done) {
    var gh = new GithubMeService(FAKE_USER);

    gh.getOrgs()
      .then(function(membership) {
        assert(Array.isArray(membership));
        assert(membership.length > 1);
      })
      .nodeify(done);

  });




});
