'use strict';

var groupService = require('../lib/group-service');
var assert = require('assert');
var fixtureLoader = require('../../../test/integration/test-fixtures');

describe('group-service', function() {

  describe('integration tests #slow', function() {

      var fixture = {};
      before(fixtureLoader(fixture, {
        group1: {},
        troupe1: {}
      }));

      after(function() {
        return fixture.cleanup();
      });

      describe('createGroup #slow', function() {
        it('should create a group', function() {
          var groupUri = 'bob' + Date.now();

          return groupService.createGroup({ name: 'Bob', uri: groupUri })
            .then(function(group) {
              assert.strictEqual(group.name, 'Bob');
              assert.strictEqual(group.uri, groupUri);
              assert.strictEqual(group.lcUri, groupUri.toLowerCase());
            });
        });
      });

      describe('findById #slow', function() {

        it('should find a group', function() {
          var groupUri = 'Bob' + Date.now();

          return groupService.createGroup({ name: 'Bob', uri: groupUri })
            .then(function(group) {
              return groupService.findById(group._id);
            })
            .then(function(group) {
              assert.strictEqual(group.name, 'Bob');
              assert.strictEqual(group.uri, groupUri);
              assert.strictEqual(group.lcUri, groupUri.toLowerCase());
            });

        });
      });

  })

})
