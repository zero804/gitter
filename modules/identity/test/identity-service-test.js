'use strict';

var identityService = require('../lib/identity-service');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var assert = require('assert');

describe('identityService', function() {
  var fixture = {};
  before(fixtureLoader(fixture, {
    deleteDocuments: {
      User: [{ githubId: null }],
      Identity: [{ provider: 'google', providerKey: 'google-identity' }]
    },
    user1: {
      githubId: null,
      githubToken: null,
    },
    user2: {
      githubId: true,
      githubToken: true
    },
    identity1: {
      user: 'user1',
      provider: 'google',
      providerKey: 'google-identity'
    }
  }));

  after(function() {
    fixture.cleanup();
  });



  describe('getIdentityForUser', function() {
    it('works for non github users', function() {
      return identityService.getIdentityForUser(fixture.user1, 'google')
        .then(function(identity) {
          assert.equal(identity.provider, 'google');
        });
    });

    it('works for github users', function() {
      return identityService.getIdentityForUser(fixture.user2, 'github')
        .then(function(identity) {
          assert.equal(identity.provider, 'github');
        });
    });
  });

  describe('listProvidersForUser', function() {
    it('works for non github users', function() {
      return identityService.listProvidersForUser(fixture.user1)
        .then(function(providers) {
          assert.deepEqual(providers, ['google']);
        });
    });

    it('works for github users', function() {
      return identityService.listProvidersForUser(fixture.user2)
        .then(function(providers) {
          assert.deepEqual(providers, ['github']);
        });
    });
  });

  describe('listForUser', function() {

      describe('non-github users', function() {
        it('returns the identities', function() {
          return identityService.listForUser(fixture.user1)
            .then(function(identities) {
              assert.deepEqual(identities, [{
                provider: "google",
                providerKey: "google-identity"
              }]);
            })
        });

        it('returns the cached identities', function() {
          var identities1;
          return identityService.listForUser(fixture.user1)
            .then(function(identities) {
              identities1 = identities;
              return identityService.listForUser(fixture.user1)
            })
            .then(function(identities2) {
              assert.equal(identities2, identities1);
            })
        });
      });

      describe('github users', function() {
        it('returns the identities', function() {
          var user = fixture.user2;
          return identityService.listForUser(user)
            .then(function(identities) {
              assert.deepEqual(identities, [{
                provider: "github",
                providerKey: user.githubId,
                username: user.username,
                displayName: user.displayName,
                email: null,
                accessToken: user.githubUserToken,
                refreshToken: null,
                accessTokenSecret: null,
                upgradedAccessToken: user.githubToken,
                scopes: user.githubScopes,
                avatar: user.gravatarImageUrl
              }]);
            })
        });

        it('returns the cached identities', function() {
          var identities1;
          return identityService.listForUser(fixture.user2)
            .then(function(identities) {
              identities1 = identities;
              return identityService.listForUser(fixture.user2)
            })
            .then(function(identities2) {
              assert.deepEqual(identities2, identities1);
            })
        });

      });

  })



});
