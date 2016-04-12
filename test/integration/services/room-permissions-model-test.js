'use strict';

var assert = require('assert');
var testRequire = require('../test-require');


describe('roomPermissionsModel', function() {
  var githubUser = { providers: ['github'] };
  var twitterUser = { providers: ['twitter'] };
  var legacyRoom = { uri: 'foo/bar', githubType: 'REPO', security: 'PUBLIC'};
  var githubRoom = { providers: ['github'], uri: 'foo/bar', githubType: 'REPO', security: 'PUBLIC' };

  var roomPermissionsModel = testRequire.withProxies('./services/room-permissions-model', {
    './permissions-model': function(user, right, uri, githubType, security) {
      return Promise.resolve("ok");
    },
    './identity-service': {
      listProvidersForUser: function(user) {
        return Promise.resolve(user.providers);
      }
    }
  });

  it('should pass through non-join right checks', function() {
    return roomPermissionsModel(githubUser, 'create', legacyRoom)
      .then(function(result) {
        assert.strictEqual(result, 'ok');
      });
  });

  it('should pass through join checks for rooms with no providers', function() {
    return roomPermissionsModel(githubUser, 'create', legacyRoom)
      .then(function(result) {
        assert.strictEqual(result, 'ok');
      });
  });

  it('should not allow a user to join a github-only room if the user does not have a github identity', function() {
    return roomPermissionsModel(twitterUser, 'join', githubRoom)
      .then(function(result) {
        assert.strictEqual(result, false);
      });
  });

  it('should allow a user to join a github-only room if the user has a github identity', function() {
    return roomPermissionsModel(githubUser, 'join', githubRoom)
      .then(function(result) {
        assert.strictEqual(result, 'ok');
      });
  });
});
