'use strict';

var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var GitHubRepoCollaboratorService = require('../lib/github-repo-collaborator-service');
var assert = require('assert');

describe('gitter-repo-collaborators-service-test', function() {
  describe('integration #slow', function() {
    var fixture = fixtureLoader.setup({
      deleteDocuments: {
        User: [{ username: fixtureLoader.GITTER_INTEGRATION_USERNAME }],
        Group: [{ lcUri: fixtureLoader.GITTER_INTEGRATION_ORG.toLowerCase() }],
      },
      user1: {
        githubToken: fixtureLoader.GITTER_INTEGRATION_USER_SCOPE_TOKEN,
        username: fixtureLoader.GITTER_INTEGRATION_USERNAME,
        accessToken: 'web-internal'
      },
    });

    it('should return repo collabators', function() {
      var underTest = new GitHubRepoCollaboratorService(fixture.user1, fixtureLoader.GITTER_INTEGRATION_REPO_FULL);
      return underTest.findCollaborators()
        .then(function(results) {
          assert(Array.isArray(results));
        })
    });


    describe('old tests', function() {
      var FAKE_USER = { username: 'gittertestbot', githubToken: '***REMOVED***'};

      it('should return suggestions for a PUBLIC REPO', function() {
        var underTest = new GitHubRepoCollaboratorService(FAKE_USER, 'gitterHQ/gitter');
        return underTest.findCollaborators()
          .then(function(userSuggestions) {
            assert(Array.isArray(userSuggestions));
            assert(userSuggestions.length > 0);
          });
      });

      it('should return suggestions for a PRIVATE REPO', function() {
        var underTest = new GitHubRepoCollaboratorService(FAKE_USER, 'troupe/gitter-webapp');
        return underTest.findCollaborators()
          .then(function(userSuggestions) {
            assert(Array.isArray(userSuggestions));
            assert(userSuggestions.length > 0);
          });
      });

      it('should return suggestions for a unknown REPO', function() {
        var underTest = new GitHubRepoCollaboratorService(FAKE_USER, 'troupe/xyz');
        return underTest.findCollaborators()
          .then(function(userSuggestions) {
            assert(Array.isArray(userSuggestions));
            assert.strictEqual(userSuggestions.length, 0);
          });
      });

    });

  });
})
