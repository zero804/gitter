'use strict';

var testRequire = require('../test-require');
var fixtureLoader = require('../test-fixtures');
var assert = require('assert');
var Promise = require('bluebird');

describe('group-resolver', function() {
  describe('#slow', function() {

    var fixture = {};
    var groupResolver;
    var adminPermission;

    before(fixtureLoader(fixture, {
      user1: {},
      troupe1: { users: ['user1'] }
    }));

    after(function() {
      fixture.cleanup();
    });

    beforeEach(function() {
      var roomPermissionsModelMock = function() {
        return Promise.resolve(adminPermission);
      };

      groupResolver = testRequire.withProxies("./services/group-resolver", {
        './room-permissions-model': roomPermissionsModelMock
      });
    });

    it('should resolve @/all mentions for admins', function() {
      var troupe = fixture.troupe1;
      var user1 = fixture.user1;
      adminPermission = true;

      return groupResolver(troupe, user1, ['all'])
        .then(function(result) {
          assert.strictEqual(result.all.announcement, true);
        });
    });

    it('should resolve not resolve mentions for non-admins', function() {
      var troupe = fixture.troupe1;
      var user1 = fixture.user1;
      adminPermission = false;

      return groupResolver(troupe, user1, ['all'])
        .then(function(result) {
          assert(!result.all);
        });
    });

  });
});
