'use strict';

var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var GitHubUserCollaboratorService = require('../lib/github-user-collaborator-service');
var assert = require('assert');

describe('gitter-user-collaborators-service-test', function() {
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

    it('should return user collabators', function() {
      var underTest = new GitHubUserCollaboratorService(fixture.user1);
      return underTest.findCollaborators()
        .then(function(results) {
          assert(Array.isArray(results));
        });
    });
    
  });
})
