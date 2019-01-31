'use strict';

var Promise = require('bluebird');
var debug = require('debug')('gitter:tests:test-fixtures');
var crypto = require('crypto');
var OAuthAccessToken = require('gitter-web-persistence').OAuthAccessToken;

function createOAuthAccessToken(fixtureName, f) {
  debug('Creating %s', fixtureName);

  return OAuthAccessToken.create({
    token: f.token || crypto.randomBytes(20).toString('hex'),
    userId: f.userId,
    clientId: f.clientId
  });
}

function createOAuthAccessTokens(expected, fixture) {
  return Promise.map(Object.keys(expected), function(key) {
    if (key.match(/^oAuthAccessToken/)) {
      var expectedOAuthAccessToken = expected[key];
      expectedOAuthAccessToken.userId = fixture[expectedOAuthAccessToken.user]._id;
      expectedOAuthAccessToken.clientId = fixture[expectedOAuthAccessToken.client]._id;

      return createOAuthAccessToken(key, expectedOAuthAccessToken).then(function(oAuthAccessToken) {
        fixture[key] = oAuthAccessToken;
      });
    }

    return null;
  });
}

module.exports = createOAuthAccessTokens;
