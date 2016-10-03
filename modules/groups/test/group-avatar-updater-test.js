'use strict';

var groupAvatarUpdater = require('../lib/group-avatar-updater');
var assert = require('assert');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var Group = require('gitter-web-persistence').Group;
var Promise = require('bluebird');

describe('group-avatar-updater', function() {

  describe('integration tests #slow', function() {
    var fixture = fixtureLoader.setup({
      group1: {},
      group2: {},
    });

    it('should update the avatar', function() {
      return groupAvatarUpdater(fixture.group1._id, 'suprememoocow')
        .then(function(result) {
          assert.strictEqual(result, true);
          return Group.findById(fixture.group1._id)
            .exec()
        })
        .then(function(group1) {
          assert(group1.avatarVersion >= 3);
          assert(group1.avatarCheckedDate >= 3);
        })
    });

    it('should not perform double fetches', function() {
      return Promise.join(
        groupAvatarUpdater(fixture.group2._id, 'suprememoocow'),
        groupAvatarUpdater(fixture.group2._id, 'suprememoocow'),
        function(a, b) {
          assert(a && !b || !a && b);
        });
    });

  });
});
