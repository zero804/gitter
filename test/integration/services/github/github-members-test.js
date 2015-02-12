/* jshint node:true, unused:strict */
/* global describe:true, it:true */
"use strict";

var testRequire = require('../../test-require');
var assert = require('assert');
var Q = require('q');

describe('github-members #slow', function() {

  it('throws if there isnt a proper githubType', function(done) {
    var githubMembers = testRequire('./services/github/github-members');

    githubMembers.getMembers('gitterHQ')
      .fail(function(err) {
        assert(err);
        done();
      });
  });

  describe('repo members', function() {

    var FakeRepoService = function() {};
    FakeRepoService.prototype.getCollaborators = function() {
      return Q.resolve([{ login: 'alice' }, { login: 'bob' }]);
    };

    var githubMembers = testRequire.withProxies('./services/github/github-members', {
      './github-repo-service': FakeRepoService
    });

    it('gets the members of a repo', function(done) {
      githubMembers.getMembers('gitterHQ/gitter', 'REPO', { githubToken: 'i am a token' })
        .then(function(members) {
          assert.deepEqual(members, ['alice', 'bob']);
        })
        .nodeify(done);
    });

    it('checks if a username is a member of a repo', function(done) {
      githubMembers.isMember('alice', 'gitterHQ/gitter', 'REPO', { githubToken: 'i am a token' })
        .then(function(isMember) {
          assert(isMember);
        })
        .nodeify(done);
    });

  });

  describe('org members', function() {

    var FakeOrgService = function() {};
    FakeOrgService.prototype.members = function() {
      return Q.resolve([{ login: 'alice' }, { login: 'bob' }]);
    };

    var githubMembers = testRequire.withProxies('./services/github/github-members', {
      './github-org-service': FakeOrgService
    });

    it('gets the members of an org', function(done) {
      githubMembers.getMembers('gitterHQ', 'ORG', { githubToken: 'i am a token' })
        .then(function(members) {
          assert.deepEqual(members, ['alice', 'bob']);
        })
        .nodeify(done);
    });

    it('checks if a username is a member of an org', function(done) {
      githubMembers.isMember('alice', 'gitterHQ', 'ORG', { githubToken: 'i am a token' })
        .then(function(isMember) {
          assert(isMember);
        })
        .nodeify(done);
    });

  });

});
