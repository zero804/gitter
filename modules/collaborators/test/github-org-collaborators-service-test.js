'use strict';

var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var GitHubOrgCollaboratorService = require('../lib/github-org-collaborator-service');
var assert = require('assert');

describe('gitter-org-collaborators-service-test #github', function() {

  describe('integration #slow', function() {

    fixtureLoader.ensureIntegrationEnvironment('integrationTests:org1:org_name', 'integrationTests:test_user:username');

    var fixture = fixtureLoader.setup({
      deleteDocuments: {
        User: [{ username: fixtureLoader.GITTER_INTEGRATION_USERNAME }]
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

  });
});
