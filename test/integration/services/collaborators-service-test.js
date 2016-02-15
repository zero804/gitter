'use strict';

var testRequire = require('./../test-require');
var getCollaboratorForRoom = testRequire('./services/collaborators-service');
var FAKE_USER = { username: 'gittertestbot', githubToken: '***REMOVED***'};
var assert = require('assert');


function assertNoDuplicates(collaborators) {
  var logins = {};
  collaborators.forEach(function(collaborator) {
    assert(!logins[collaborator.login]);
    logins[collaborator.login] = true;
  });
}

describe('collaborators-service #slow', function() {

  it('should return collaborators for a PUBLIC REPO', function() {
    return getCollaboratorForRoom({ security: 'PUBLIC', githubType: 'REPO', uri: 'gitterHQ/gitter' }, FAKE_USER)
      .then(function(collaborators) {
        assert(Array.isArray(collaborators));
        assert(collaborators.length > 0);
        assert(collaborators[0].login);
        assertNoDuplicates(collaborators);
      });
  });

  it('should return collaborators for a PRIVATE REPO', function() {
    return getCollaboratorForRoom({ security: 'PRIVATE',  githubType: 'REPO', uri: 'troupe/gitter-webapp' }, FAKE_USER)
      .then(function(collaborators) {
        assert(!collaborators.some(function(f) {
          return f.login === 'waltfy';
        }));

        assert(!collaborators.some(function(f) {
          return f.login === 'timlind';
        }));

        assert(Array.isArray(collaborators));
        assert(collaborators.length > 0);
        assert(collaborators[0].login);
        assertNoDuplicates(collaborators);
      });
  });

  it('should return collaborators for a unknown REPO', function() {
    return getCollaboratorForRoom({ security: 'PUBLIC',  githubType: 'REPO', uri: 'troupe/xyz' }, FAKE_USER)
      .then(function(collaborators) {
        assert(Array.isArray(collaborators));
        assert(collaborators.length > 0);
        assert(collaborators[0].login);
        assertNoDuplicates(collaborators);
      });
  });

  it('should return collaborators for an ORG', function() {
    return getCollaboratorForRoom({ githubType: 'ORG', uri: 'troupe' }, FAKE_USER)
      .then(function(collaborators) {
        assert(!collaborators.some(function(f) {
          return f.login === 'waltfy';
        }));

        assert(!collaborators.some(function(f) {
          return f.login === 'timlind';
        }));

        assert(Array.isArray(collaborators));
        assert(collaborators.length > 0);
        assert(collaborators[0].login);
        assertNoDuplicates(collaborators);
      });
  });

  it('should return collaborators for an USER', function() {
    return getCollaboratorForRoom({ githubType: 'USER', uri: 'gittertestbot' }, FAKE_USER)
      .then(function(collaborators) {
        assert(Array.isArray(collaborators));
        assert(collaborators.length > 0);
        assert(collaborators[0].login);
        assertNoDuplicates(collaborators);
      });
  });

});
