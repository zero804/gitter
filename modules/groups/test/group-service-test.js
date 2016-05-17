'use strict';

var groupService = require('../lib/group-service');
var assert = require('assert');

describe('group-service', function() {

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
  describe('findById', function() {
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
