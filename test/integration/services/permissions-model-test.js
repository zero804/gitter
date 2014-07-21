/*jslint node:true, unused:true*/
/*global describe:true, it:true, beforeEach */
"use strict";

var testRequire = require('../test-require');
var assert = require('assert');
var Q = require('q');

var mockito = require('jsmockito').JsMockito;
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
var permissionsModel;
var permissionMocks;
var fixtures;
var delegate;

beforeEach(function() {
  USER = { username: 'gitterbob' };
  URI = 'uri';
  SECURITY = 'SECURITAAAAAI'; // Always just passed through
  userBannedFromRoomMock = mockito.mockFunction();

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

  permissionsModel = testRequire.withProxies("./services/permissions-model", {
    './user-banned-from-room': userBannedFromRoomMock,
    './permissions/repo-permissions-model': repoPermissionsModelMock,
    './permissions/org-permissions-model': orgPermissionsModelMock,
    './permissions/one-to-one-permissions-model': oneToOnePermissionsModelMock,
    './permissions/org-channel-permissions-model': orgChannelPermissionsModelMock,
    './permissions/repo-channel-permissions-model': repoChannelPermissionsModelMock,
    './permissions/user-channel-permissions-model': userChannelPermissionsModelMock,
  });

});

var RIGHTS = ['create', 'join', 'admin', 'adduser', 'view'];
var ROOM_TYPES = ['REPO', 'ORG', 'ONETOONE', 'ORG_CHANNEL', 'REPO_CHANNEL', 'USER_CHANNEL'];

describe('permissions-model', function() {
  ROOM_TYPES.forEach(function(roomType) {
    describe('Room type ' + roomType, function() {
      setupRoomTypeTests(roomType);
    });
  });

  describe('token rejection', function() {
    beforeEach(function() {
      mockito.when(userBannedFromRoomMock)().then(function() { return Q.resolve(false); });
      mockito.when(orgPermissionsModelMock)().then(function() {
        var error = new Error();
        error.gitterAction = 'logout_destroy_user_tokens';
        return Q.reject(error);
      });
    });

    it('destroys the user token', function(done) {
      var user = {
        username: 'gitterbob',
        destroyTokens: function() {
          done();
        }
      };

      permissionsModel(user, 'join', 'uri', 'ORG', 'PUBLIC');
    });

    it('saves the destruction of the user token', function(done) {
      var user = {
        username: 'gitterbob',
        destroyTokens: function() {},
        saveQ: function() {
          done();
        }
      };

      permissionsModel(user, 'join', 'uri', 'ORG', 'PUBLIC');
    });

    it('destroys the optional github user token (if supplied)', function(done) {
      var user = {
        username: 'gitterbob',
        destroyTokens: function() {
          assert(false, 'user token should not be destroyed');
        }
      };

      var tokenUser = {
        username: 'usemytokens',
        destroyTokens: function() {
          done();
        }
      };

      permissionsModel(user, 'join', 'uri', 'ORG', 'PUBLIC', { githubTokenUser: tokenUser });
    });

    it('saves the destruction of the optional github user token (if supplied)', function(done) {
      var user = {
        username: 'gitterbob',
        destroyTokens: function() {
          assert(false, 'user token should not be destroyed');
        }
      };

      var tokenUser = {
        username: 'usemytokens',
        destroyTokens: function() {},
        saveQ: function() {
          done();
        }
      };

      permissionsModel(user, 'join', 'uri', 'ORG', 'PUBLIC', { githubTokenUser: tokenUser });
    });

  });

  it('passes options through', function(done) {
    mockito.when(userBannedFromRoomMock)().then(function() { return Q.resolve(false); });
    mockito.when(orgPermissionsModelMock)().then(function(user, right, uri, security, options) {
      assert.equal(options.someoption, 'iamhere');
      done();
    });

    permissionsModel({}, 'join', 'uri', 'ORG', 'PUBLIC', { someoption: 'iamhere' });
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

        return Q.resolve(false);
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

              return Q.resolve(allowAccess);
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

        return Q.resolve(true);
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