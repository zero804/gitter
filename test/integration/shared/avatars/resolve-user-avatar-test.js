'use strict';

var assert = require('assert');
var resolveUserAvatarUrl = require('gitter-web-shared/avatars/resolve-user-avatar-url');

describe('user avatar url generator', function() {

  describe('when passed a user object', function() {
    it('should return a github url for a github gravatarImageUrl', function() {
      var user = {
        username: 'lerouxb',
        gravatarImageUrl: 'https://avatars.githubusercontent.com/u/69737?v=3'
      };
      var result = resolveUserAvatarUrl(user, 40);
      assert.equal(result, 'https://avatars1.githubusercontent.com/u/69737?s=40&v=3');
    });

    it('should return a google url for a google gravatarImageUrl', function() {
      var user = {
        gravatarImageUrl: 'https://lh5.googleusercontent.com/-8JzxZyD84qE/AAAAAAAAAAI/AAAAAAAAAN4/_x36v4AaxKo/photo.jpg'
      };
      var result = resolveUserAvatarUrl(user, 40)
      assert.equal(result, user.gravatarImageUrl+'?sw=40');
    });
  });

  describe('when passed a serialized user', function() {
    it('should return avatarUrl* when set', function() {
      var user = {
        avatarUrlSmall: 'https://avatars.githubusercontent.com/u/69737?v=3&s=60',
        avatarUrlMedium: 'https://avatars.githubusercontent.com/u/69737?v=3&s=128'
      };
      assert.equal(resolveUserAvatarUrl(user, 60), user.avatarUrlSmall);
      assert.equal(resolveUserAvatarUrl(user, 128), user.avatarUrlMedium);
    });

    it('should return a github url for github username and version', function() {
      var user = {
        username: 'whaaaaat',
        gv: '3'
      };
      var result = resolveUserAvatarUrl(user, 60);
      assert.equal(result, 'https://avatars0.githubusercontent.com/whaaaaat?v=3&s=60');
    });

    it('should return a resolver url for non-github username', function() {
      var user = {
        username: '1234_'
      };
      var result = resolveUserAvatarUrl(user, 60);
      assert.equal(result, '/api/private/user-avatar/1234_?s=60');
    });
  });

});
