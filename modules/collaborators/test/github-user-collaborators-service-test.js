'use strict';

var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var GitHubUserCollaboratorService = require('../lib/github-user-collaborator-service');
var assert = require('assert');

describe('github-user-collaborators-service-test #github', function() {

  describe('integration #slow', function() {
    fixtureLoader.ensureIntegrationEnvironment('integrationTests:test_user:username');

    var fixture = fixtureLoader.setup({
      user1: '#integrationUser1'
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
