'use strict';

var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var GitHubOrgCollaboratorService = require('../lib/github-org-collaborator-service');
var assert = require('assert');


describe('gitter-org-collaborators-service-test', function() {
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

    it('should return org collabators', function() {
      var underTest = new GitHubOrgCollaboratorService(fixture.user1, fixtureLoader.GITTER_INTEGRATION_ORG);
      return underTest.findCollaborators()
        .then(function(results) {
          assert(Array.isArray(results));
        });
    });

    describe('old tests', function() {
      var FAKE_USER = { username: 'gittertestbot', githubToken: '***REMOVED***'};

      it('should return suggestions for a ORG', function() {
        var underTest = new GitHubOrgCollaboratorService(FAKE_USER, 'troupe');
        return underTest.findCollaborators()
          .then(function(userSuggestions) {
            assert(Array.isArray(userSuggestions));
            assert(userSuggestions.length > 0);
          });
      });

    });
  });
});
