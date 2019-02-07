'use strict';

var Promise = require('bluebird');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var assert = require('assert');
var User = require('gitter-web-persistence').User;
var Identity = require('gitter-web-persistence').Identity;
var userRemovalService = require('../lib/user-removal-service');

describe('user-removal-service', function() {
  var fixture = fixtureLoader.setup({
    user1: {},
    identity1: {
      user: 'user1',
      provider: 'gitlab',
      providerKey: 'abcd1234'
    }
  });

  describe('#removeByUsername', () => {
    it('should mark user as removed', function(done) {
      userRemovalService
        .removeByUsername(fixture.user1.username)
        .then(() => User.findOne({ _id: fixture.user1._id }))
        .then(user => {
          assert.strictEqual(user.state, 'REMOVED');
        })
        .nodeify(done);
    });

    it('should remove and convert to ghost user when ghost option is passed', function(done) {
      assert.strictEqual(fixture.user1.identities.length, 1);

      userRemovalService
        .removeByUsername(fixture.user1.username, { ghost: true })
        .then(() => {
          return Promise.props({
            user: User.findOne({ _id: fixture.user1._id }),
            identities: Identity.find({ userId: fixture.user1._id })
          });
        })
        .then(({ user, identities }) => {
          assert.strictEqual(user.state, 'REMOVED');
          assert.strictEqual(user.username, `ghost~${fixture.user1._id}`);
          assert.strictEqual(user.displayName, 'Ghost');

          assert.strictEqual(user.identities.length, 0);
          assert.strictEqual(identities.length, 0);
        })
        .nodeify(done);
    });
  });
});
