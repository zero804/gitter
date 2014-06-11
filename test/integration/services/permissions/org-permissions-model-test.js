/*jslint node:true, unused:true*/
/*global describe:true, it:true, beforeEach */
"use strict";

var testRequire = require('../../test-require');
var assert = require('assert');
var Q = require('q');

var mockito = require('jsmockito').JsMockito;

function GitHubOrgServiceMocker() {
  this.member = orgMemberMethodMock;
}

var user;
var permissionsModel;
var orgMemberMethodMock;

beforeEach(function() {
  user = { username: 'gitterbob' };

  orgMemberMethodMock = mockito.mockFunction();

  permissionsModel = testRequire.withProxies("./services/permissions/org-permissions-model", {
    '../github/github-org-service': GitHubOrgServiceMocker,
  });
});

describe('ORGS', function() {

  var security = null;
  var uri = 'x';

  // mock for each usergroup
  var m = {
    members: true,
    not_members: false
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
      allowed:  ['members'],
      denied:   ['not_members']
    },
    admin: {
      allowed:  ['members'],
      denied:   ['not_members']
    }
  };

  Object.keys(rights).forEach(function(right) {

    describe(right, function() {
      rights[right].allowed.forEach(function(usergroup) {
        it('should allow ' + usergroup, function(done) {

          mockito.when(orgMemberMethodMock)().then(function(org) {
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

          mockito.when(orgMemberMethodMock)().then(function(org) {
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