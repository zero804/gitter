/*jslint node:true, unused:true*/
/*global describe:true, it:true, beforeEach */
"use strict";

var testRequire = require('../../test-require');
var assert = require('assert');
var Q = require('q');

var mockito = require('jsmockito').JsMockito;

var user;
var user2;
var permissionsModel;
var uriIsPremiumMethodMock;
var userIsInRoomMock;
var uri;

beforeEach(function() {
  user = { username: 'gitterbob' };
  user2 = { username: 'gitterclare' };
  uri = 'gitterclare/custom';

  uriIsPremiumMethodMock = mockito.mockFunction();
  userIsInRoomMock = mockito.mockFunction();

  mockito.when(uriIsPremiumMethodMock)().then(function(uri) {
    return Q.resolve(true);
  });

  permissionsModel = testRequire.withProxies("./services/permissions/user-channel-permissions-model", {
    '../uri-is-premium': uriIsPremiumMethodMock,
    '../user-in-room': userIsInRoomMock
  });

});


describe('USER_CHANNEL', function() {

  describe('PUBLIC', function() {
    var security = 'PUBLIC';

    describe('join', function() {
      var right = 'join';

      it('should allow', function(done) {
        return permissionsModel(user, right, uri, security)
          .then(function(granted) {
            assert(granted);
          })
          .nodeify(done);
      });

    });

    describe('adduser', function() {
      var right = 'adduser';


      it('should allow', function(done) {
        return permissionsModel(user, right, uri, security)
          .then(function(granted) {
            assert(granted);
          })
          .nodeify(done);
      });

    });


    describe('create', function() {
      var right = 'create';

      it('should allow for the owner', function(done) {
        return permissionsModel(user2, right, uri, security)
          .then(function(granted) {
            assert(granted);
          })
          .nodeify(done);
      });

      it('should deny for non owner', function(done) {
        return permissionsModel(user, right, uri, security)
          .then(function(granted) {
            assert(!granted);
          })
          .nodeify(done);
      });

    });

    describe('admin', function() {
      var right = 'admin';

      it('should allow for the owner', function(done) {
        return permissionsModel(user2, right, uri, security)
          .then(function(granted) {
            assert(granted);
          })
          .nodeify(done);
      });

      it('should deny for non owner', function(done) {
        return permissionsModel(user, right, uri, security)
          .then(function(granted) {
            assert(!granted);
          })
          .nodeify(done);
      });
    });
  });

  describe('PRIVATE', function() {
    var security = 'PRIVATE';

    describe('join', function() {
      var right = 'join';

      it('should allow people already in the room', function(done) {
        mockito.when(userIsInRoomMock)().then(function(pUri, pUser) {
          assert.equal(pUri, uri);
          assert.equal(pUser, user);
          return Q.resolve(true);
        });

        return permissionsModel(user, right, uri, security)
          .then(function(granted) {
            assert(granted);
          })
          .nodeify(done);
      });

      it('should deny people not already in the room', function(done) {
        mockito.when(userIsInRoomMock)().then(function(pUri, pUser) {
          assert.equal(pUri, uri);
          assert.equal(pUser, user);
          return Q.resolve(false);
        });

        return permissionsModel(user, right, uri, security)
          .then(function(granted) {
            assert(!granted);
          })
          .nodeify(done);
      });

    });

    describe('adduser', function() {
      var right = 'adduser';

      it('should allow for the owner', function(done) {
        return permissionsModel(user2, right, uri, security)
          .then(function(granted) {
            assert(granted);
          })
          .nodeify(done);
      });

      it('should allow for somebody in the room', function(done) {
        mockito.when(userIsInRoomMock)().then(function(pUri, pUser) {
          assert.equal(pUri, uri);
          assert.equal(pUser, user);
          return Q.resolve(true);
        });

        return permissionsModel(user, right, uri, security)
          .then(function(granted) {
            assert(granted);
          })
          .nodeify(done);
      });


      it('should deny somebody not in the room', function(done) {
        mockito.when(userIsInRoomMock)().then(function(pUri, pUser) {
          assert.equal(pUri, uri);
          assert.equal(pUser, user);
          return Q.resolve(false);
        });

        return permissionsModel(user, right, uri, security)
          .then(function(granted) {
            assert(!granted);
          })
          .nodeify(done);
      });
    });


    describe('create', function() {
      var right = 'create';

      it('should allow for the owner', function(done) {
        return permissionsModel(user2, right, uri, security)
          .then(function(granted) {
            assert(granted);
          })
          .nodeify(done);
      });

      it('should deny for non owner', function(done) {
        return permissionsModel(user, right, uri, security)
          .then(function(granted) {
            assert(!granted);
          })
          .nodeify(done);
      });

    });

    describe('admin', function() {
      var right = 'admin';

      it('should allow for the owner', function(done) {
        return permissionsModel(user2, right, uri, security)
          .then(function(granted) {
            assert(granted);
          })
          .nodeify(done);
      });

      it('should deny for non owner', function(done) {
        return permissionsModel(user, right, uri, security)
          .then(function(granted) {
            assert(!granted);
          })
          .nodeify(done);
      });
    });
  });

});
