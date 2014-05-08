/* jshint node:true, unused:strict */
/*global describe:true, it:true */
"use strict";

var testRequire    = require('../../test-require');
var assert         = require("assert");
var GithubOrgService = testRequire('./services/github/github-org-service');
var FAKE_USER = { username: 'gittertestbot', githubToken: '64c1d90a8c60d2ee75fc5b3d3f7881d94559fec8'};

describe('github-org-service', function() {
  it('members should fetch members', function(done) {
    var gh = new GithubOrgService(FAKE_USER);

    gh.members('gitterHQ')
      .then(function(members) {
        assert(members.length >= 1);

        gh.members('gitterHQ')
          .then(function(members) {
            assert(members.length >= 1);
          });
      })
      .nodeify(done);
  });

  it('member should return true if a user is in an org', function(done) {
    var gh = new GithubOrgService(FAKE_USER);

    gh.member('gitterHQ','gittertestbot')
      .then(function(isMember) {
        assert(isMember);
      })
      .nodeify(done);
  });


  it('member should return true if a user is in an org', function(done) {
    var gh = new GithubOrgService(FAKE_USER);

    gh.member('gitterHQ','mydigitalself')
      .then(function(isMember) {
        assert(isMember);
      })
      .nodeify(done);
  });

  it('member should return a list of users in the owners team in an org', function(done) {
    var gh = new GithubOrgService(FAKE_USER);

    gh.getOwners('gitterHQ')
      .then(function(members) {
        assert(members.some(function(member) { return member.login === 'suprememoocow'; }));
      })
      .nodeify(done);
  });



  xit('member should return false if a user is not in an org GITTERHQ', function(done) {
    var gh = new GithubOrgService({ username: 'mbtesting', githubToken: 'e00b7680cd3665d50ebd6f0fe0ba3e49e2600c67'});

    gh.member('gitterHQ','mbtesting')
      .then(function(isMember) {
        assert(!isMember);
      })
      .nodeify(done);
  });


  xit('member should return false if a user is not in an org TROUPE', function(done) {
    var gh = new GithubOrgService({ username: 'mbtesting', githubToken: 'e00b7680cd3665d50ebd6f0fe0ba3e49e2600c67'});

    gh.member('troupe','mbtesting')
      .then(function(isMember) {
        assert(!isMember);
      })
      .nodeify(done);
  });


  xit('member should return mtbtesting is not a member of ADOBE', function(done) {
    var gh = new GithubOrgService({ username: 'mbtesting', githubToken: 'e00b7680cd3665d50ebd6f0fe0ba3e49e2600c67'});

    gh.member('adobe','mbtesting')
      .then(function(isMember) {
        assert(!isMember);
      })
      .nodeify(done);
  });


  it('member should that suprememoocow is a member of gitterTest', function(done) {
    var gh = new GithubOrgService({ username: 'suprememoocow', githubToken: '23cc53bcfa09e8ff22a03cf8a73e1115f987b0e6'});

    gh.member('gitterTest','suprememoocow')
      .then(function(isMember) {
        assert(!isMember);
      })
      .nodeify(done);
  });


  it('member should that suprememoocow is not a member of gitterTest', function(done) {
    var gh = new GithubOrgService({ username: 'suprememoocow', githubToken: '23cc53bcfa09e8ff22a03cf8a73e1115f987b0e6'});

    gh.member('gitterTest','suprememoocow')
      .then(function(isMember) {
        assert(!isMember);
      })
      .nodeify(done);
  });



  it('member should return true if a user is in an org', function(done) {
    var gh = new GithubOrgService(FAKE_USER);

    gh.member('gitterHQ','indexzero')
      .then(function(isMember) {
        assert(!isMember);
      })
      .nodeify(done);
  });




});
