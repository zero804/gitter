'use strict';

var assert = require('assert');
var getUserAvatarForSize = require('gitter-web-shared/avatars/get-user-avatar-for-size');

describe('user avatar url generator', function() {

  describe('when passed a user object', function() {
    it('should return a github url for a github gravatarImageUrl', function() {
      var user = {
        gravatarImageUrl: 'https://avatars.githubusercontent.com/u/69737?v=3'
      };
      assert.equal(getUserAvatarForSize(user, 40), user.gravatarImageUrl+'&s=40');
    });

    it('should return a google url for a google gravatarImageUrl', function() {
      var user = {
        gravatarImageUrl: 'https://lh5.googleusercontent.com/-8JzxZyD84qE/AAAAAAAAAAI/AAAAAAAAAN4/_x36v4AaxKo/photo.jpg'
      };
      assert.equal(getUserAvatarForSize(user, 40), user.gravatarImageUrl+'?sw=40');
    });
  });

  describe('when passed a serialized user', function() {
    it('should return avatarUrl* when set', function() {
      var user = {
        avatarUrlSmall: 'https://avatars.githubusercontent.com/u/69737?v=3&s=60',
        avatarUrlMedium: 'https://avatars.githubusercontent.com/u/69737?v=3&s=128'
      };
      assert.equal(getUserAvatarForSize(user, 60), user.avatarUrlSmall);
      assert.equal(getUserAvatarForSize(user, 128), user.avatarUrlMedium);
    });

    it('should return a github url for github username and version', function() {
      var user = {
        username: 'lerouxb',
        gv: '3'
      };
      assert.equal(getUserAvatarForSize(user, 60), 'https://avatars1.githubusercontent.com/lerouxb?v=3&s=60');
    });

    it('should return a resolver url for non-github username', function() {
      var user = {
        username: '1234_'
      };
      assert.equal(getUserAvatarForSize(user, 60), '/api/private/user-avatar/1234_?s=60');
    });
  });

});
