/* jshint node:true, unused:strict */
/* global describe:true, it:true */
"use strict";

var testRequire = require('../../test-require');
var assert = require('assert');
var Q = require('q');

describe('github-members', function() {

  describe('mocks', function() {

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
      FakeRepoService.prototype.isCollaborator = function(uri) {
        assert.strictEqual('gitterHQ/gitter', uri);
        return Q.resolve(true);
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
      FakeOrgService.prototype.member = function(uri, username) {
        assert.strictEqual(uri, 'gitterHQ');
        assert.strictEqual('alice', username);
        return Q.resolve(true);
      };
      FakeOrgService.prototype.members = function(uri) {
        assert.strictEqual(uri, 'gitterHQ');
        return Q.resolve([{ login: 'alice' }, { login: 'bob' }]);
      };

      var FakeMeService = function() {};
      FakeMeService.prototype.isOrgMember = function(uri) {
        assert.strictEqual('gitterHQ', uri);
        return Q.resolve(true);
      };

      var githubMembers = testRequire.withProxies('./services/github/github-members', {
        './github-org-service': FakeOrgService,
        './github-me-service': FakeMeService
      });

      it('gets the members of an org', function(done) {
        githubMembers.getMembers('gitterHQ', 'ORG', { githubToken: 'i am a token' })
          .then(function(members) {
            assert.deepEqual(members, ['alice', 'bob']);
          })
          .nodeify(done);
      });

      it('checks if a username is a member of an org', function(done) {
        githubMembers.isMember('alice', 'gitterHQ', 'ORG', { username: 'alice', githubToken: 'i am a token' })
          .then(function(isMember) {
            assert(isMember);
          })
          .nodeify(done);
      });

      it('checks if a username is a member of an org', function(done) {
        githubMembers.isMember('alice', 'gitterHQ', 'ORG', { username: 'mary', githubToken: 'i am a token' })
          .then(function(isMember) {
            assert(isMember);
          })
          .nodeify(done);
      });

    });

  });

  describe('real #slow', function() {
    var FAKE_USER = { username: 'gittertestbot', githubToken: '***REMOVED***'};
    var githubMembers = testRequire('./services/github/github-members');


    describe('getMembers', function() {
      it('should get members of an ORG', function(done) {
        githubMembers.getMembers('gitterHQ', 'ORG', FAKE_USER)
          .then(function(members) {
            assert(members.length > 0);
            members.forEach(assert);
          })
          .nodeify(done);
      });

      it('should get members of an REPO', function(done) {
        githubMembers.getMembers('gittertestbot/docs', 'REPO', FAKE_USER)
          .then(function(members) {
            assert(members.length > 0);
            members.forEach(assert);
          })
          .nodeify(done);
      });

    });

    describe('isMember', function() {
      it('should get member of an ORG', function(done) {
        githubMembers.isMember('suprememoocow', 'gitterHQ', 'ORG', FAKE_USER)
          .then(function(isMember) {
            assert.strictEqual(isMember, true);
          })
          .nodeify(done);
      });

      it('should get member of an ORG negative', function(done) {
        githubMembers.isMember('tj', 'gitterHQ', 'ORG', FAKE_USER)
          .then(function(isMember) {
            assert.strictEqual(isMember, false);
          })
          .nodeify(done);
      });

      it('should get member of an ORG current user', function(done) {
        githubMembers.isMember('gittertestbot', 'gitterHQ', 'ORG', FAKE_USER)
          .then(function(isMember) {
            assert.strictEqual(isMember, true);
          })
          .nodeify(done);
      });

      it('should get member of an ORG current user negative', function(done) {
        githubMembers.isMember('gittertestbot', 'joyent', 'ORG', FAKE_USER)
          .then(function(isMember) {
            assert.strictEqual(isMember, false);
          })
          .nodeify(done);
      });

      it('should get member of an REPO', function(done) {
        githubMembers.isMember('suprememoocow', 'gittertestbot/docs', 'REPO', FAKE_USER)
          .then(function(isMember) {
            assert.strictEqual(isMember, false);
          })
          .nodeify(done);
      });

      it('should get member of an REPO current user', function(done) {
        githubMembers.isMember('gittertestbot', 'gittertestbot/docs', 'REPO', FAKE_USER)
          .then(function(isMember) {
            assert.strictEqual(isMember, true);
          })
          .nodeify(done);
      });

    });

  });

});
