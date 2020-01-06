'use strict';

var Promise = require('bluebird');
var Identity = require('gitter-web-persistence').Identity;
const fixtureUtils = require('./fixture-utils');
var debug = require('debug')('gitter:tests:test-fixtures');

function createIdentity(fixtureName, f) {
  debug('Creating %s', fixtureName);

  return Identity.findOneAndUpdate(
    { provider: f.provider, providerKey: f.providerKey },
    {
      userId: f.userId,
      provider: f.provider,
      providerKey: f.providerKey,
      // We avoid the E11000 duplicate key error collection with the
      // `provider_1_username_1` index by providing a random username instead of `null`
      username: f.username || fixtureUtils.generateUsername(),
      displayName: f.displayName,
      email: f.email,
      accessToken: f.accessToken,
      refreshToken: f.refreshToken,
      avatar: f.avatar
    },
    {
      new: true,
      // Make this update into an upsert
      // We upsert to avoid the unique constraints on the schema and having to
      // remove the identity before we create a new one every time
      // This is especially useful for the integration users like `#integrationGitlabUser1`
      // which have the same real values which would otherwise conflict
      upsert: true
    }
  );
}

function createIdentities(expected, fixture) {
  return Promise.map(Object.keys(expected), function(key) {
    if (key.match(/^identity/)) {
      var expectedIdentity = expected[key];

      expectedIdentity.userId = fixture[expectedIdentity.user]._id;

      return createIdentity(key, expectedIdentity).then(function(identity) {
        fixture[key] = identity;

        // Add the identity back on the user object
        fixture[expectedIdentity.user].identities = (
          fixture[expectedIdentity.user].identities || []
        ).concat({
          provider: identity.provider,
          providerKey: identity.providerKey
        });
      });
    }

    return null;
  });
}

module.exports = createIdentities;
