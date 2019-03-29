'use strict';

const Promise = require('bluebird');
const fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
const assert = require('assert');
const persistence = require('gitter-web-persistence');
const User = persistence.User;
const Identity = persistence.Identity;
const TroupeUser = persistence.TroupeUser;
const userRemovalService = require('../lib/user-removal-service');

describe('user-removal-service', function() {
  var fixture = fixtureLoader.setup({
    user1: {},
    userWithRooms1: {},
    identity1: {
      user: 'user1',
      provider: 'gitlab',
      providerKey: 'abcd1234'
    },
    group1: {},
    troupe1: { users: ['userWithRooms1'] },
    troupe2: { users: ['userWithRooms1'] },
    troupe3: { users: ['userWithRooms1'] },
    troupe4: { users: ['userWithRooms1'] },
    troupe5: { users: ['userWithRooms1'] },
    troupe6: { users: ['userWithRooms1'] },
    troupe7: { users: ['userWithRooms1'] },
    troupe8: { users: ['userWithRooms1'] },
    troupe1Group1: {
      group: 'group1',
      users: ['userWithRooms1']
    },
    troupe2Group1: {
      group: 'group1',
      users: ['userWithRooms1']
    },
    troupe3Group1: {
      group: 'group1',
      users: ['userWithRooms1']
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

    it('should remove room membership', async () => {
      const roomMembershipBefore = await TroupeUser.find({ userId: fixture.userWithRooms1._id });
      assert.strictEqual(roomMembershipBefore.length, 11);

      await userRemovalService.removeByUsername(fixture.userWithRooms1.username);

      const roomMembershipAfter = await TroupeUser.find({ userId: fixture.userWithRooms1._id });
      assert.strictEqual(roomMembershipAfter.length, 0);
    });
  });
});
