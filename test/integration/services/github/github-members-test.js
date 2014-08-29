/* jshint node:true, unused:strict */
/* global describe:true, it:true */
"use strict";

var testRequire = require('../../test-require');
var assert = require('assert');
var Q = require('q');

describe('github-members', function() {
  it('gets the members of a repo', function(done) {
    var FakeRepoService = function() {};
    FakeRepoService.prototype.getCollaborators = function() {
      return Q.resolve([{ login: 'alice' }, { login: 'bob' }]);
    };

    var githubMembers = testRequire.withProxies('./services/github/github-members', {
      './github-repo-service': FakeRepoService
    });

    githubMembers.getMembers('gitterHQ/gitter', 'REPO', { githubToken: 'i am a token' })
      .then(function(members) {
        assert.deepEqual(members, ['alice', 'bob']);
      })
      .nodeify(done);
  });

  it('checks if a username is a member of a repo', function(done) {
    var FakeRepoService = function() {};
    FakeRepoService.prototype.getCollaborators = function() {
      return Q.resolve([{ login: 'alice' }, { login: 'bob' }]);
    };

    var githubMembers = testRequire.withProxies('./services/github/github-members', {
      './github-repo-service': FakeRepoService
    });

    githubMembers.isMember('alice', 'gitterHQ/gitter', 'REPO', { githubToken: 'i am a token' })
      .then(function(isMember) {
        assert(isMember);
      })
      .nodeify(done);
  });

});
