'use strict';

const assert = require('assert');
const sinon = require('sinon');
const fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
const proxyquireNoCallThru = require('proxyquire').noCallThru();

describe('group-avatars', () => {
  const daysAgo = nmbOfDays => {
    const d = new Date();
    d.setDate(d.getDate() - nmbOfDays);
    return d;
  };
  let fixtures = fixtureLoader.setupEach({
    group1: {
      securityDescriptor: {
        type: 'GH_ORG',
        linkPath: 'test-org'
      },
      avatarVersion: 2,
      avatarCheckedDate: daysAgo(8)
    },
    group2: {
      securityDescriptor: {
        type: 'GH_ORG',
        linkPath: 'test-org'
      },
      avatarVersion: 2,
      avatarCheckedDate: daysAgo(6)
    },
    groupCustomAvatar3: {
      securityDescriptor: {
        type: 'GH_ORG',
        linkPath: 'test-org'
      },
      avatarVersion: 2,
      avatarCheckedDate: daysAgo(6),
      avatarUrl:
        'https://gitter-avatars-dev.s3.amazonaws.com/groups/5d1448202711a7087b2e4fb5/original'
    },
    groupGitlab1: {
      securityDescriptor: {
        type: 'GL_GROUP',
        linkPath: 'test-group'
      },
      avatarVersion: 1,
      avatarCheckedDate: daysAgo(8)
    },
    groupGitlab2: {
      securityDescriptor: {
        type: 'GL_GROUP',
        linkPath: 'test-group'
      },
      avatarUrl:
        'https://assets.gitlab-static.net/uploads/-/system/group/avatar/1540914/icon_128x128.png',
      avatarVersion: 1,
      avatarCheckedDate: daysAgo(6)
    }
  });

  describe('custom avatar', () => {
    it('should use custom avatar', async () => {
      const updateGroupAvatarStub = sinon.stub();
      updateGroupAvatarStub.returns(Promise.resolve());

      const groupAvatars = proxyquireNoCallThru('../lib/group-avatars', {
        './update-group-avatar': updateGroupAvatarStub,
        './is-gitter-internal-group-avatar-url': () => true
      });

      const avatarUrl = await groupAvatars.getAvatarUrlForGroupId(
        fixtures.groupCustomAvatar3._id,
        64
      );

      assert.strictEqual(
        avatarUrl,
        `https://gitter-avatars-dev.s3.amazonaws.com/groups/5d1448202711a7087b2e4fb5/64?v=2`
      );

      // avatar update shouldn't be triggered since it's been less than a week since the last check
      assert(updateGroupAvatarStub.notCalled);
    });
  });

  describe('GitLab', () => {
    it('should update avatar if it has been a week since the last update', async () => {
      const updateGroupAvatarStub = sinon.stub();
      updateGroupAvatarStub
        .withArgs(sinon.match.has('_id', fixtures.groupGitlab1._id))
        .returns(Promise.resolve());

      const groupAvatars = proxyquireNoCallThru('../lib/group-avatars', {
        './update-group-avatar': updateGroupAvatarStub
      });

      await groupAvatars.getAvatarUrlForGroupId(fixtures.groupGitlab1._id);

      // avatar update should be triggered since it's been over a week since the last check
      assert(updateGroupAvatarStub.calledOnce);
    });

    it('should use old avatar if it has been less than a week since the last update', async () => {
      const updateGroupAvatarStub = sinon.stub();
      updateGroupAvatarStub.returns(Promise.resolve());

      const groupAvatars = proxyquireNoCallThru('../lib/group-avatars', {
        './update-group-avatar': updateGroupAvatarStub
      });

      const avatarUrl = await groupAvatars.getAvatarUrlForGroupId(fixtures.groupGitlab2._id, 64);

      assert.strictEqual(
        avatarUrl,
        `${fixtures.groupGitlab2.avatarUrl}?v=${fixtures.groupGitlab2.avatarVersion}&width=64`
      );

      // avatar update shouldn't be triggered since it's been less than a week since the last check
      assert(updateGroupAvatarStub.notCalled);
    });
  });

  describe('GitHub', () => {
    it('should update avatar if it has been a week since the last update', async () => {
      const updateGroupAvatarStub = sinon.stub();
      updateGroupAvatarStub
        .withArgs(sinon.match.has('_id', fixtures.group1._id))
        .returns(Promise.resolve());

      const groupAvatars = proxyquireNoCallThru('../lib/group-avatars', {
        './update-group-avatar': updateGroupAvatarStub
      });

      await groupAvatars.getAvatarUrlForGroupId(fixtures.group1._id);

      // avatar update should be triggered since it's been over a week since the last check
      assert(updateGroupAvatarStub.calledOnce);
    });

    it('should use old avatar if it has been less than a week since the last update', async () => {
      const updateGroupAvatarStub = sinon.stub();
      updateGroupAvatarStub.returns(Promise.resolve());

      const groupAvatars = proxyquireNoCallThru('../lib/group-avatars', {
        './update-group-avatar': updateGroupAvatarStub
      });

      const avatarUrl = await groupAvatars.getAvatarUrlForGroupId(fixtures.group2._id, 64);

      assert.strictEqual(avatarUrl, `https://avatars.githubusercontent.com/test-org?s=64&v=2`);

      // avatar update shouldn't be triggered since it's been less than a week since the last check
      assert(updateGroupAvatarStub.notCalled);
    });
  });
});
