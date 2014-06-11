/*jslint node:true, unused:true*/
/*global describe:true, it:true, beforeEach */
"use strict";

var testRequire = require('../../test-require');
var assert = require('assert');
var Q = require('q');

var mockito = require('jsmockito').JsMockito;

var user;
var permissionsModel;
var getRepoMethodMock;
var uriIsPremiumMethodMock;

function GitHubRepoServiceMocker() {
  this.getRepo = getRepoMethodMock;
}

beforeEach(function() {
  user = { username: 'gitterbob' };

  getRepoMethodMock = mockito.mockFunction();
  uriIsPremiumMethodMock = mockito.mockFunction();

  mockito.when(uriIsPremiumMethodMock)().then(function(uri, callback) {
    callback(null, true);
  });

  permissionsModel = testRequire.withProxies("./services/permissions/repo-permissions-model", {
    '../github/github-repo-service': GitHubRepoServiceMocker,
    '../uri-is-premium': uriIsPremiumMethodMock
  });

});

describe('REPOs', function() {

  var uri = 'x/y';

  describe('PRIVATE', function() {
    var security = 'PRIVATE';

    // mocks for each usergroup
    var m = {
      members: true,
      not_members: false,
      people_with_push_access: {permissions: {push: true}},
      people_with_admin_access: {permissions: {admin: true}},
      people_with_pull_access_only: {permissions: {pull: true}}
    };

    var rights = {
      view: {
        allowed:  ['members'],
        denied:   ['not_members']
      },
      join: {
        allowed:  ['members'],
        denied:   ['not_members']
      },
      adduser: {
        allowed:  ['members'],
        denied:   ['not_members']
      },
      create: {
        allowed:  ['people_with_push_access', 'people_with_admin_access'],
        denied:   ['not_members', 'people_with_pull_access_only']
      },
      admin: {
        allowed:  ['people_with_push_access', 'people_with_admin_access'],
        denied:   ['not_members', 'people_with_pull_access_only']
      }
    };

    Object.keys(rights).forEach(function(right) {

      describe(right, function() {
        rights[right].allowed.forEach(function(usergroup) {
          it('should allow ' + usergroup, function(done) {

            mockito.when(getRepoMethodMock)().then(function(org) {
              assert.equal(org, uri);
              return Q.resolve(m[usergroup]);
            });

            return permissionsModel(user, right, uri, security)
              .then(function(granted) {
                assert(granted);
              })
              .nodeify(done);
          });
        });

        rights[right].denied.forEach(function(usergroup) {
          it('should deny ' + usergroup, function(done) {

            mockito.when(getRepoMethodMock)().then(function(org) {
              assert.equal(org, uri);
              return Q.resolve(m[usergroup]);
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

  });

  describe('PUBLIC', function() {
    var security = 'PUBLIC';

    // mocks for each usergroup
    var m = {
      members: true,
      not_members: false,
      people_with_push_access: {permissions: {push: true}},
      people_with_admin_access: {permissions: {admin: true}},
      people_with_pull_access_only: {permissions: {pull: true}}
    };

    var rights = {
      view: {
        allowed:  ['members'],
        denied:   []
      },
      join: {
        allowed:  ['members'],
        denied:   ['not_members']
      },
      adduser: {
        allowed:  ['members'],
        denied:   ['not_members']
      },
      create: {
        allowed:  ['people_with_push_access', 'people_with_admin_access'],
        denied:   ['not_members', 'people_with_pull_access_only']
      },
      admin: {
        allowed:  ['people_with_push_access', 'people_with_admin_access'],
        denied:   ['not_members', 'people_with_pull_access_only']
      }
    };

    Object.keys(rights).forEach(function(right) {

      describe(right, function() {
        rights[right].allowed.forEach(function(usergroup) {
          it('should allow ' + usergroup, function(done) {

            mockito.when(getRepoMethodMock)().then(function(org) {
              assert.equal(org, uri);
              return Q.resolve(m[usergroup]);
            });

            return permissionsModel(user, right, uri, security)
              .then(function(granted) {
                assert(granted);
              })
              .nodeify(done);
          });
        });

        rights[right].denied.forEach(function(usergroup) {
          it('should deny ' + usergroup, function(done) {

            mockito.when(getRepoMethodMock)().then(function(org) {
              assert.equal(org, uri);
              return Q.resolve(m[usergroup]);
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

  });
});
