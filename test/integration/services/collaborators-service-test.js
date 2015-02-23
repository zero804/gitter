'use strict';

var testRequire = require('./../test-require');
var getCollaboratorForRoom = testRequire('./services/collaborators-service');
var FAKE_USER = { username: 'gittertestbot', githubToken: '***REMOVED***'};
var assert = require('assert');

describe('collaborators-service #slow', function() {

  it('should return collaborators for a PUBLIC REPO', function(done) {
    return getCollaboratorForRoom({ security: 'PUBLIC', githubType: 'REPO', uri: 'gitterHQ/gitter' }, FAKE_USER)
      .then(function(collaborators) {
        assert(Array.isArray(collaborators));
        assert(collaborators.length > 0);
      })
      .nodeify(done);
  });

  it('should return collaborators for a PRIVATE REPO', function(done) {
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
      })
      .nodeify(done);
  });

  it('should return collaborators for an ORG', function(done) {
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
      })
      .nodeify(done);
  });

});
