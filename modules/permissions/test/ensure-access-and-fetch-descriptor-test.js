"use strict";

var assert = require('assert');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var StatusError = require('statuserror');
var ensureAccessAndFetchDescriptor = require('gitter-web-permissions/lib/ensure-access-and-fetch-descriptor');

describe('ensure-access-and-fetch-descriptor #slow', function() {
  this.timeout(10000);

  var fixture = fixtureLoader.setup({
    user1: {
      githubToken: fixtureLoader.GITTER_INTEGRATION_USER_SCOPE_TOKEN,
      username: fixtureLoader.GITTER_INTEGRATION_USERNAME,
      accessToken: 'web-internal'
    }
  });

  it('should return a descriptor for type null', function() {
    return ensureAccessAndFetchDescriptor(fixture.user1, {
        security: 'PUBLIC'
      })
      .then(function(sd) {
        assert.deepEqual(sd, {
          type: null,
          admins: 'MANUAL',
          public: true,
          members: 'PUBLIC',
          extraMembers: [],
          extraAdmins: [ fixture.user1._id ]
        });
      });
  });

  it('should throw an error if you give it an unknown type', function() {
    return ensureAccessAndFetchDescriptor(fixture.user1, { type: 'foo' })
      .then(function() {
        assert.ok(false, 'Expected error');
      })
      .catch(StatusError, function(err) {
        assert.strictEqual(err.status, 400);
      });
  });

  it('should return a descriptor for a github org if the user has access', function() {
    return ensureAccessAndFetchDescriptor(fixture.user1, {
        type: 'GH_ORG',
        linkPath: fixtureLoader.GITTER_INTEGRATION_ORG,
        security: 'PUBLIC'
      })
      .then(function(sd) {
        assert.deepEqual(sd, {
          type: 'GH_ORG',
          members: 'PUBLIC',
          admins: 'GH_ORG_MEMBER',
          public: true,
          linkPath: fixtureLoader.GITTER_INTEGRATION_ORG,
          externalId: fixtureLoader.GITTER_INTEGRATION_ORG_ID
        });
      });
  });

  it('should return a descriptor for a github user if the user has access', function() {
    return ensureAccessAndFetchDescriptor(fixture.user1, {
        type: 'GH_USER',
        linkPath: fixtureLoader.GITTER_INTEGRATION_USERNAME,
        security: 'PUBLIC'
      })
      .then(function(sd) {
        assert.deepEqual(sd, {
          type: 'GH_USER',
          members: 'PUBLIC',
          admins: 'GH_USER_SAME',
          public: true,
          linkPath: fixtureLoader.GITTER_INTEGRATION_USERNAME,
          externalId: fixtureLoader.GITTER_INTEGRATION_USER_ID,
          extraAdmins: [] // no user id because the username matches
        });
      });
  });

  it('should return a descriptor for a github repo if the user has access', function() {
    var linkPath = fixtureLoader.GITTER_INTEGRATION_REPO_FULL;

    return ensureAccessAndFetchDescriptor(fixture.user1, {
        type: 'GH_REPO',
        linkPath: linkPath,
        security: 'PUBLIC'
      })
      .then(function(sd) {
        assert.deepEqual(sd, {
          type: 'GH_REPO',
          members: 'PUBLIC',
          admins: 'GH_REPO_PUSH',
          public: true,
          linkPath: linkPath,
          externalId: fixtureLoader.GITTER_INTEGRATION_REPO_ID
        });
      });
  });

  it('should return a descriptor for an unknown github owner if the user has access', function() {
    // suppose you don't know if linkPath is an org or user and you're just
    // upserting a group for it
    var linkPath = fixtureLoader.GITTER_INTEGRATION_ORG;

    return ensureAccessAndFetchDescriptor(fixture.user1, {
        type: 'GH_GUESS',
        linkPath: linkPath,
        security: 'PUBLIC'
      })
      .then(function(sd) {
        assert.deepEqual(sd, {
          type: 'GH_ORG',
          members: 'PUBLIC',
          admins: 'GH_ORG_MEMBER',
          public: true,
          linkPath: linkPath,
          externalId: fixtureLoader.GITTER_INTEGRATION_ORG_ID
        });
      });
  });

  it('should throw an error if the returned github type does not match as expected', function() {
    return ensureAccessAndFetchDescriptor(fixture.user1, {
        type: 'GH_ORG',
        linkPath: fixtureLoader.GITTER_INTEGRATION_REPO_FULL,
        security: 'PUBLIC'
      })
      .then(function() {
        assert.ok(false, 'Expected error');
      })
      .catch(StatusError, function(err) {
        assert.strictEqual(err.status, 400);
      });
  });

  it('should throw an error if the user does not have access', function() {
    return ensureAccessAndFetchDescriptor(fixture.user1, {
        type: 'GH_ORG',
        linkPath: 'gitterHQ',
        security: 'PUBLIC'
      })
      .then(function() {
        assert.ok(false, 'Expected error');
      })
      .catch(StatusError, function(err) {
        assert.strictEqual(err.status, 403);
      });
  });

  it('should throw an error if the github object does not exist', function() {
    return ensureAccessAndFetchDescriptor(fixture.user1, {
        type: 'GH_ORG',
        linkPath: 'foo-foo-does-not-exist',
        security: 'PUBLIC'
      })
      .then(function() {
        assert.ok(false, 'Expected error');
      })
      .catch(StatusError, function(err) {
        assert.strictEqual(err.status, 404);
      });
  });
});
