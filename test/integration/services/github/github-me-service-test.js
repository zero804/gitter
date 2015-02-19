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





});
