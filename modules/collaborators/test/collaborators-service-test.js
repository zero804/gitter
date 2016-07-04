'use strict';

var collaboratorsService = require('../lib/collaborators-service');
var FAKE_USER = { username: 'gittertestbot', githubToken: '***REMOVED***'};
var assert = require('assert');

function assertNoDuplicates(collaborators) {
  var logins = {};
  collaborators.forEach(function(collaborator) {
    // TODO: add other services into this test
    assert(!logins[collaborator.githubUsername]);
    logins[collaborator.githubUsername] = true;
  });
}

describe('collaborators-service #slow', function() {
  it('should return collaborators for a PUBLIC REPO', function() {
    return collaboratorsService.findCollaborators(FAKE_USER, 'GH_REPO', 'gitterHQ/gitter')
      .then(function(collaborators) {
        assert(Array.isArray(collaborators));
        assert(collaborators.length > 0);
        assert(collaborators[0].githubUsername);
        assertNoDuplicates(collaborators);
      });
  });

  it('should return collaborators for a PRIVATE REPO', function() {
    return collaboratorsService.findCollaborators(FAKE_USER, 'GH_REPO', 'troupe/gitter-webapp')
      .then(function(collaborators) {
        assert(Array.isArray(collaborators));
        assert(collaborators.length > 0);
        assert(collaborators[0].githubUsername);
        assertNoDuplicates(collaborators);
      });
  });

  it('should return collaborators for a unknown REPO', function() {
    return collaboratorsService.findCollaborators(FAKE_USER, 'GH_REPO', 'troupe/xyz')
      .then(function(collaborators) {
        assert(Array.isArray(collaborators));
        assert.strictEqual(collaborators.length, 0);
        assertNoDuplicates(collaborators);
      });
  });

  it('should return collaborators for an ORG', function() {
    return collaboratorsService.findCollaborators(FAKE_USER, 'GH_ORG', 'troupe')
      .then(function(collaborators) {
        assert(Array.isArray(collaborators));
        assert(collaborators.length > 0);
        assert(collaborators[0].githubUsername);
        assertNoDuplicates(collaborators);
      });
  });

  it('should return collaborators for an USER', function() {
    return collaboratorsService.findCollaborators(FAKE_USER, null, null)
      .then(function(collaborators) {
        assert(Array.isArray(collaborators));
        // assert(collaborators.length > 0);
        // assert(collaborators[0].githubUsername);
        assertNoDuplicates(collaborators);
      });
  });

});
