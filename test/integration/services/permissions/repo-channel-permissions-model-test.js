/*jslint node:true, unused:true*/
/*global describe:true, it:true, beforeEach */
"use strict";

var testRequire = require('../../test-require');
var assert = require('assert');
var Q = require('q');

var mockito = require('jsmockito').JsMockito;

var user;
var permissionsModel;
var uriIsPremiumMethodMock;
var userIsInRoomMock;
var repoPermissionsMock;

beforeEach(function() {
  user = { username: 'gitterbob' };

  uriIsPremiumMethodMock = mockito.mockFunction();
  userIsInRoomMock = mockito.mockFunction();
  repoPermissionsMock = mockito.mockFunction();

  mockito.when(uriIsPremiumMethodMock)().then(function(uri) {
    return Q.resolve(true);
  });

  permissionsModel = testRequire.withProxies("./services/permissions/repo-channel-permissions-model", {
    './repo-permissions-model': repoPermissionsMock,
    '../uri-is-premium': uriIsPremiumMethodMock,
    '../user-in-room': userIsInRoomMock
  });

});


describe('REPO_CHANNEL', function() {
  var uri = 'x/custom';
  var parentUri = 'x';

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

      it('should allow for repo push members', function(done) {
        mockito.when(repoPermissionsMock)().then(function(user, right, repo) {
          assert.equal(repo, parentUri);
          return Q.resolve({ permissions: { push: true } });
        });

        return permissionsModel(user, right, uri, security)
          .then(function(granted) {
            assert(granted);
          })
          .nodeify(done);
      });

      it('should allow for repo admin members', function(done) {
        mockito.when(repoPermissionsMock)().then(function(user, right, repo) {
          assert.equal(repo, parentUri);
          return Q.resolve({ permissions: { admin: true } });
        });

        return permissionsModel(user, right, uri, security)
          .then(function(granted) {
            assert(granted);
          })
          .nodeify(done);
      });

      it('should deny for repo pull members', function(done) {
        mockito.when(repoPermissionsMock)().then(function(user, right, repo) {
          assert.equal(repo, parentUri);
          assert.equal(right, 'create');
          return Q.resolve(false);
        });

        return permissionsModel(user, right, uri, security)
          .then(function(granted) {
            assert(!granted);
          })
          .nodeify(done);
      });

      it('should deny for non repo members', function(done) {
        mockito.when(repoPermissionsMock)().then(function(user, right, repo) {
          assert.equal(repo, parentUri);
          return Q.resolve(null);
        });

        return permissionsModel(user, right, uri, security)
          .then(function(granted) {
            assert(!granted);
          })
          .nodeify(done);
      });

    });

    describe('admin', function() {
      var right = 'admin';

      it('should allow for repo push members', function(done) {
        mockito.when(repoPermissionsMock)().then(function(user, right, repo) {
          assert.equal(repo, parentUri);
          return Q.resolve({ permissions: { push: true } });
        });

        return permissionsModel(user, right, uri, security)
          .then(function(granted) {
            assert(granted);
          })
          .nodeify(done);
      });

      it('should allow for repo admin members', function(done) {
        mockito.when(repoPermissionsMock)().then(function(user, right, repo) {
          assert.equal(repo, parentUri);
          return Q.resolve({ permissions: { admin: true } });
        });

        return permissionsModel(user, right, uri, security)
          .then(function(granted) {
            assert(granted);
          })
          .nodeify(done);
      });

      it('should deny for repo pull members', function(done) {
        mockito.when(repoPermissionsMock)().then(function(user, right, repo) {
          assert.equal(repo, parentUri);
          assert.equal(right, 'admin');
          return Q.resolve(false);
        });

        return permissionsModel(user, right, uri, security)
          .then(function(granted) {
            assert(!granted);
          })
          .nodeify(done);
      });

      it('should deny for non repo members', function(done) {
        mockito.when(repoPermissionsMock)().then(function(user, right, repo) {
          assert.equal(repo, parentUri);
          return Q.resolve(null);
        });

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

      it('should allow somebody already in the room', function(done) {
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

      it('should deny somebody not already in the room', function(done) {
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

      it('should allow repo members in the room to add', function(done) {
        mockito.when(userIsInRoomMock)().then(function(pUri, pUser) {
          assert.equal(pUri, uri);
          assert.equal(pUser, user);
          return Q.resolve(true);
        });

        mockito.when(repoPermissionsMock)().then(function(user, right, repo) {
          assert.equal(repo, parentUri);
          return Q.resolve(true);
        });

        return permissionsModel(user, right, uri, security)
          .then(function(granted) {
            assert(granted);
          })
          .nodeify(done);
      });

      it('should deny repo members not in the room to add', function(done) {
        mockito.when(userIsInRoomMock)().then(function(pUri, pUser) {
          assert.equal(pUri, uri);
          assert.equal(pUser, user);
          return Q.resolve(false);
        });

        mockito.when(repoPermissionsMock)().then(function(user, right, repo) {
          assert.equal(repo, parentUri);
          return Q.resolve(true);
        });

        return permissionsModel(user, right, uri, security)
          .then(function(granted) {
            assert(!granted);
          })
          .nodeify(done);
      });


      it('should deny non repo members add', function(done) {

        mockito.when(repoPermissionsMock)().then(function(user, right, repo) {
          assert.equal(repo, parentUri);
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

      it('should allow for repo admin members', function(done) {
        mockito.when(repoPermissionsMock)().then(function(user, right, repo) {
          assert.equal(repo, parentUri);
          return Q.resolve({ permissions: { admin: true } });
        });

        return permissionsModel(user, right, uri, security)
          .then(function(granted) {
            assert(granted);
          })
          .nodeify(done);
      });

      it('should allow for repo push members', function(done) {
        mockito.when(repoPermissionsMock)().then(function(user, right, repo) {
          assert.equal(repo, parentUri);
          return Q.resolve({ permissions: { push: true } });
        });

        return permissionsModel(user, right, uri, security)
          .then(function(granted) {
            assert(granted);
          })
          .nodeify(done);
      });


      it('should deny for repo pull members', function(done) {
        mockito.when(repoPermissionsMock)().then(function(user, right, repo) {
          assert.equal(repo, parentUri);
          assert.equal(right, 'create');
          return Q.resolve(false);
        });

        return permissionsModel(user, right, uri, security)
          .then(function(granted) {
            assert(!granted);
          })
          .nodeify(done);
      });

      it('should deny for non repo members', function(done) {
        mockito.when(repoPermissionsMock)().then(function(user, right, repo) {
          assert.equal(repo, parentUri);
          return Q.resolve();
        });

        return permissionsModel(user, right, uri, security)
          .then(function(granted) {
            assert(!granted);
          })
          .nodeify(done);
      });

    });

    describe('admin', function() {
      var right = 'admin';

      it('should allow repo admin members', function(done) {
        mockito.when(repoPermissionsMock)().then(function(user, right, repo) {
          assert.equal(repo, parentUri);
          return Q.resolve({ permissions: { admin: true } });
        });

        return permissionsModel(user, right, uri, security)
          .then(function(granted) {
            assert(granted);
          })
          .nodeify(done);
      });

      it('should allow repo push members', function(done) {
        mockito.when(repoPermissionsMock)().then(function(user, right, repo) {
          assert.equal(repo, parentUri);
          return Q.resolve({ permissions: { push: true } });
        });

        return permissionsModel(user, right, uri, security)
          .then(function(granted) {
            assert(granted);
          })
          .nodeify(done);
      });


      it('should deny repo pull members', function(done) {
        mockito.when(repoPermissionsMock)().then(function(user, right, repo) {
          assert.equal(repo, parentUri);
          assert.equal(right, 'admin');
          return Q.resolve(false);
        });

        return permissionsModel(user, right, uri, security)
          .then(function(granted) {
            assert(!granted);
          })
          .nodeify(done);
      });

      it('should deny non repo members', function(done) {
        mockito.when(repoPermissionsMock)().then(function(user, right, repo) {
          assert.equal(repo, parentUri);
          return Q.resolve();
        });

        return permissionsModel(user, right, uri, security)
          .then(function(granted) {
            assert(!granted);
          })
          .nodeify(done);
      });

    });

  });

  describe('INHERITED', function() {
    var security = 'INHERITED';

    describe('join', function() {
      var right = 'join';

      it('should allow repo members', function(done) {
        mockito.when(repoPermissionsMock)().then(function(user, right, repo) {
          assert.equal(repo, parentUri);
          return Q.resolve({ permissions: { pull: true } });
        });

        return permissionsModel(user, right, uri, security)
          .then(function(granted) {
            assert(granted);
          })
          .nodeify(done);
      });

      it('should deny non repo members', function(done) {
        mockito.when(repoPermissionsMock)().then(function(user, right, repo) {
          assert.equal(repo, parentUri);
          return Q.resolve(null);
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

      it('should allow repo members to add', function(done) {
        mockito.when(repoPermissionsMock)().then(function(user, right, repo) {
          assert.equal(repo, parentUri);
          return Q.resolve({ permissions: { pull: true } });
        });

        return permissionsModel(user, right, uri, security)
          .then(function(granted) {
            assert(granted);
          })
          .nodeify(done);
      });


      it('should deny non repo members add', function(done) {
        mockito.when(repoPermissionsMock)().then(function(user, right, repo) {
          assert.equal(repo, parentUri);
          return Q.resolve();
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

      it('should allow for repo admin members', function(done) {
        mockito.when(repoPermissionsMock)().then(function(user, right, repo) {
          assert.equal(repo, parentUri);
          return Q.resolve({ permissions: { admin: true } });
        });

        return permissionsModel(user, right, uri, security)
          .then(function(granted) {
            assert(granted);
          })
          .nodeify(done);
      });

      it('should allow for repo push members', function(done) {
        mockito.when(repoPermissionsMock)().then(function(user, right, repo) {
          assert.equal(repo, parentUri);
          return Q.resolve({ permissions: { push: true } });
        });

        return permissionsModel(user, right, uri, security)
          .then(function(granted) {
            assert(granted);
          })
          .nodeify(done);
      });

      it('should deny for repo pull members', function(done) {
        mockito.when(repoPermissionsMock)().then(function(user, right, repo) {
          assert.equal(repo, parentUri);
          assert.equal(right, 'create');
          return Q.resolve(false);
        });

        return permissionsModel(user, right, uri, security)
          .then(function(granted) {
            assert(!granted);
          })
          .nodeify(done);
      });

      it('should deny for non repo members', function(done) {
        mockito.when(repoPermissionsMock)().then(function(user, right, repo) {
          assert.equal(repo, parentUri);
          return Q.resolve();
        });

        return permissionsModel(user, right, uri, security)
          .then(function(granted) {
            assert(!granted);
          })
          .nodeify(done);
      });

    });

    describe('admin', function() {
      var right = 'admin';

      it('should allow for repo admin members', function(done) {
        mockito.when(repoPermissionsMock)().then(function(user, right, repo) {
          assert.equal(repo, parentUri);
          return Q.resolve({ permissions: { admin: true } });
        });

        return permissionsModel(user, right, uri, security)
          .then(function(granted) {
            assert(granted);
          })
          .nodeify(done);
      });

      it('should allow for repo push members', function(done) {
        mockito.when(repoPermissionsMock)().then(function(user, right, repo) {
          assert.equal(repo, parentUri);
          return Q.resolve({ permissions: { push: true } });
        });

        return permissionsModel(user, right, uri, security)
          .then(function(granted) {
            assert(granted);
          })
          .nodeify(done);
      });

      it('should deny for repo pull members', function(done) {
        mockito.when(repoPermissionsMock)().then(function(user, right, repo) {
          assert.equal(repo, parentUri);
          assert.equal(right, 'admin');
          return Q.resolve(false);
        });

        return permissionsModel(user, right, uri, security)
          .then(function(granted) {
            assert(!granted);
          })
          .nodeify(done);
      });

      it('should deny for non repo members', function(done) {
        mockito.when(repoPermissionsMock)().then(function(user, right, repo) {
          assert.equal(repo, parentUri);
          return Q.resolve();
        });

        return permissionsModel(user, right, uri, security)
          .then(function(granted) {
            assert(!granted);
          })
          .nodeify(done);
      });

    });


  });
});
