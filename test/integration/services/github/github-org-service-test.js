/* jshint node:true, unused:strict */
/*global describe:true, it:true */
"use strict";

var testRequire    = require('../../test-require');
var assert         = require("assert");
var GithubOrgService = testRequire('./services/github/github-org-service');


describe('github-org-service', function() {
  it('members should fetch members', function(done) {
    var gh = new GithubOrgService({ githubAccessToken: '64c1d90a8c60d2ee75fc5b3d3f7881d94559fec8'});

    gh.members('gitterHQ')
      .then(function(members) {
        assert(members.length >= 1);
      })
      .nodeify(done);
  });

  it('member should return true if a user is in an org', function(done) {
    var gh = new GithubOrgService({ githubAccessToken: '64c1d90a8c60d2ee75fc5b3d3f7881d94559fec8'});

    gh.member('gitterHQ','gittertestbot')
      .then(function(isMember) {
        assert(isMember);
      })
      .nodeify(done);
  });


  it('member should return true if a user is in an org', function(done) {
    var gh = new GithubOrgService({ githubAccessToken: '64c1d90a8c60d2ee75fc5b3d3f7881d94559fec8'});

    gh.member('gitterHQ','mydigitalself')
      .then(function(isMember) {
        assert(isMember);
      })
      .nodeify(done);
  });

  it('member should return true if a user is in an org', function(done) {
    var gh = new GithubOrgService({ githubAccessToken: '64c1d90a8c60d2ee75fc5b3d3f7881d94559fec8'});

    gh.member('gitterHQ','indexzero')
      .then(function(isMember) {
        assert(!isMember);
      })
      .nodeify(done);
  });



});