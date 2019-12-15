'use strict';

const updateGroupAvatar = require('../lib/update-group-avatar');
const assert = require('assert');
const fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
const Group = require('gitter-web-persistence').Group;

describe('updateGroupAvatar', () => {
  describe('integration tests #slow', () => {
    const fixture = fixtureLoader.setup({
      group1: {
        securityDescriptor: {
          type: 'GH_USER',
          linkPath: 'suprememoocow'
        }
      },
      group2: {
        securityDescriptor: {
          type: 'GH_USER',
          linkPath: 'suprememoocow'
        }
      },
      groupGitlab1: {
        securityDescriptor: {
          type: 'GL_GROUP',
          linkPath: 'gitter-integration-tests-group',
          externalId: 3281315
        }
      }
    });

    it('should update GitHub avatar', async () => {
      const n = Date.now();

      const result = await updateGroupAvatar(fixture.group1);
      assert.strictEqual(result, true);

      const group1 = await Group.findById(fixture.group1._id).exec();
      assert(group1.avatarVersion >= 3);
      assert(group1.avatarCheckedDate >= n);
    });

    it('should update GitLab avatar', async () => {
      const n = Date.now();

      const result = await updateGroupAvatar(fixture.groupGitlab1);
      assert.strictEqual(result, true);

      const groupGitlab1 = await Group.findById(fixture.groupGitlab1._id).exec();
      assert(groupGitlab1.avatarUrl);
      assert.strictEqual(groupGitlab1.avatarVersion, 1);
      assert(groupGitlab1.avatarCheckedDate >= n);
    });

    it('should not perform double fetches', async () => {
      const a = await updateGroupAvatar(fixture.group2);
      const b = await updateGroupAvatar(fixture.group2);
      assert(
        Boolean(a) !== Boolean(b),
        `expected one updateGroupAvatar call to return false (a=${a}, b=${b})`
      );
    });
  });
});
