/*jslint node:true, unused:true*/
/*global describe:true, it:true, beforeEach */
"use strict";

var testRequire = require('../test-require');
var assert = require('assert');
var Promise = require('bluebird');

var mockito = require('jsmockito').JsMockito;
var times = mockito.Verifiers.times;
var once = times(1);

var USER;
var URI;
var SECURITY;
var repoPermissionsModelMock;
var userBannedFromRoomMock;
var orgPermissionsModelMock;
var oneToOnePermissionsModelMock;
var orgChannelPermissionsModelMock;
var repoChannelPermissionsModelMock;
var userChannelPermissionsModelMock;
var userServiceMock;
var destroyTokensForUserIdMock;
var permissionsModel;
var permissionMocks;
var fixtures;
var delegate;


var RIGHTS = ['create', 'join', 'admin', 'adduser', 'view'];
var ROOM_TYPES = ['REPO', 'ORG', 'ONETOONE', 'ORG_CHANNEL', 'REPO_CHANNEL', 'USER_CHANNEL'];

describe('permissions-model', function() {

  beforeEach(function() {
    USER = { username: 'gitterbob' };
    URI = 'uri';
    SECURITY = 'SECURITAAAAAI'; // Always just passed through
    userBannedFromRoomMock = mockito.mockFunction();
    destroyTokensForUserIdMock = mockito.mockFunction();

    permissionMocks = [
      repoPermissionsModelMock = mockito.mockFunction(),
      orgPermissionsModelMock = mockito.mockFunction(),
      oneToOnePermissionsModelMock = mockito.mockFunction(),
      orgChannelPermissionsModelMock = mockito.mockFunction(),
      repoChannelPermissionsModelMock = mockito.mockFunction(),
      userChannelPermissionsModelMock = mockito.mockFunction()
    ];

    fixtures = {
      'REPO': repoPermissionsModelMock,
      'ORG': orgPermissionsModelMock,
      'ONETOONE': oneToOnePermissionsModelMock,
      'ORG_CHANNEL': orgChannelPermissionsModelMock,
      'REPO_CHANNEL': repoChannelPermissionsModelMock,
      'USER_CHANNEL': userChannelPermissionsModelMock
    };

    userServiceMock = {
      destroyTokensForUserId: destroyTokensForUserIdMock
    };

    permissionsModel = testRequire.withProxies("./services/permissions-model", {
      'gitter-web-permissions/lib/user-banned-from-room': userBannedFromRoomMock,
      './user-service': userServiceMock,
      './permissions/repo-permissions-model': repoPermissionsModelMock,
      './permissions/org-permissions-model': orgPermissionsModelMock,
      './permissions/one-to-one-permissions-model': oneToOnePermissionsModelMock,
      './permissions/org-channel-permissions-model': orgChannelPermissionsModelMock,
      './permissions/repo-channel-permissions-model': repoChannelPermissionsModelMock,
      './permissions/user-channel-permissions-model': userChannelPermissionsModelMock,
    });

  });

  ROOM_TYPES.forEach(function(roomType) {
    describe('Room type ' + roomType, function() {
      setupRoomTypeTests(roomType);
    });
  });

  describe('token rejection', function() {
    beforeEach(function() {
      mockito.when(userBannedFromRoomMock)().then(function() { return Promise.resolve(false); });
      mockito.when(destroyTokensForUserIdMock)().then(function() { return Promise.resolve(); });
      mockito.when(orgPermissionsModelMock)().then(function() {
        var error = new Error();
        error.gitterAction = 'logout_destroy_user_tokens';
        return Promise.reject(error);
      });
    });

    it('destroys the user token', function(done) {
      var user = {
        _id: 'x',
        username: 'gitterbob'
      };

      permissionsModel(user, 'join', 'uri', 'ORG', 'PUBLIC')
        .then(function() {
          assert(false, 'should have failed');
        }, function(err) {
          assert.strictEqual(err.gitterAction, 'logout_destroy_user_tokens');
        })
        .finally(function() {
          mockito.verify(destroyTokensForUserIdMock, once)('x');
        })
        .nodeify(done);

    });

    it('saves the destruction of the user token', function(done) {
      var user = {
        _id: 'y',
        username: 'gitterbob'
      };

      permissionsModel(user, 'join', 'uri', 'ORG', 'PUBLIC')
        .then(function() {
          assert(false, 'should have failed');
        }, function(err) {
          assert.strictEqual(err.gitterAction, 'logout_destroy_user_tokens');
        })
        .finally(function() {
          mockito.verify(destroyTokensForUserIdMock, once)('y');
        })
        .nodeify(done);

    });

  });

});

function setupRoomTypeTests(roomType) {
  beforeEach(function() {
    // Stop the other mocks from being called
    permissionMocks.filter(function(m) { return m !== delegate; }).forEach(function(mock) {
      mockito.when(mock)().then(function() {
        assert(false, 'Unexpected call to mock ' + mock);
      });
    });
  });

  describe('non banned', function() {

    beforeEach(function() {
      delegate = fixtures[roomType];

      // Stop the other mocks from being called
      permissionMocks.filter(function(m) { return m !== delegate; }).forEach(function(mock) {
        mockito.when(mock)().then(function() {
          assert(false, 'Unexpected call to mock ' + mock);
        });
      });

      mockito.when(userBannedFromRoomMock)().then(function(uri, user) {
        assert.strictEqual(uri, URI);
        assert.strictEqual(user, USER);

        return Promise.resolve(false);
      });
    });

    [true, false].forEach(function(allowAccess) {
      describe(allowAccess ? 'Access allowed' : 'Access denied', function() {

        RIGHTS.forEach(function(right) {

          it('should pass the request to the underlying model for ' + right, function(done) {
            mockito.when(delegate)().then(function(user, iRight, uri, security) {
              assert.strictEqual(uri, URI);
              assert.strictEqual(user, USER);
              assert.strictEqual(iRight, right);
              assert.strictEqual(security, SECURITY);

              return Promise.resolve(allowAccess);
            });

            permissionsModel(USER, right, URI, roomType, SECURITY)
              .then(function(result) {
                assert.strictEqual(result, allowAccess);
              })
              .nodeify(done);
          });
        });


      });

    });


  });

  describe('banned', function() {
    beforeEach(function() {
      // Stop the mocks from being called
      permissionMocks.forEach(function(mock) {
        mockito.when(mock)().then(function() {
          assert(false, 'Unexpected call to mock ' + mock);
        });
      });

      mockito.when(userBannedFromRoomMock)().then(function(uri, user) {
        assert.strictEqual(uri, URI);
        assert.strictEqual(user, USER);

        return Promise.resolve(true);
      });

    });

    RIGHTS.forEach(function(right) {
      it('should not allow a banned user to ' + right, function(done) {
        permissionsModel(USER, right, URI, roomType, SECURITY)
          .then(function(result) {
            assert.strictEqual(result, false);
          })
          .nodeify(done);
      });
    });

  });

}
