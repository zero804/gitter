'use strict';

var identityService = require('../lib/identity-service');
var fixtureLoader = require('../../../test/integration/test-fixtures');
var assert = require('assert');

describe('identityService', function() {
  var fixture = {};
  before(fixtureLoader(fixture, {
    user1: {},
    identity1: {
      user: 'user1',
      provider: 'google',
      providerKey: 'google-identity'
    },
  }));

  after(function() {
    fixture.cleanup();
  });

  it('returns the identities', function() {
    return identityService.findForUser(fixture.user1)
      .then(function(identities) {
        assert.equal(identities.length, 1);
      })
  });

  it('returns the cached identities', function() {
    var identities1;
    return identityService.findForUser(fixture.user1)
      .then(function(identities) {
        identities1 = identities;
        return identityService.findForUser(fixture.user1)
      })
      .then(function(identities2) {
        assert.equal(identities2, identities1);
      })
  });

  it('returns a provider for GitHub users', function() {
    return identityService.listProvidersForUser({ username: 'githubuser' })
      .then(function(providers) {
        assert.strictEqual(providers.length, 1);
        assert.strictEqual(providers[0], 'github');
      });
  });

  it('returns a provider for Google users', function() {
    return identityService.listProvidersForUser(fixture.user1)
      .then(function(providers) {
        assert.strictEqual(providers.length, 1);
        assert.strictEqual(providers[0], 'google');
      });
  });
});
