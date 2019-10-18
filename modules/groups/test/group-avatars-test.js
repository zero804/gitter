'use strict';

const assert = require('assert');
const sinon = require('sinon');
const fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
const mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
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
    }
  });
  it('should update avatar if it has been a week since the last update', async () => {
    const groupAvatarUpdaterStub = sinon.stub();
    groupAvatarUpdaterStub
      // the asObjectID is here only to match the implementation of group-avatars
      .withArgs(mongoUtils.asObjectID(fixtures.group1.id), 'test-org')
      .returns(Promise.resolve());
    const groupAvatars = proxyquireNoCallThru('../lib/group-avatars', {
      './group-avatar-updater': groupAvatarUpdaterStub
    });

    await groupAvatars.getAvatarUrlForGroupId(fixtures.group1.id);

    // avatar update should be triggered since it's been over a week since the last check
    assert(groupAvatarUpdaterStub.calledOnce);
  });
  it('should use old avatar if it has been  less than a week since the last update', async () => {
    const groupAvatarUpdaterStub = sinon.spy();
    const groupAvatars = proxyquireNoCallThru('../lib/group-avatars', {
      './group-avatar-updater': groupAvatarUpdaterStub
    });

    await groupAvatars.getAvatarUrlForGroupId(fixtures.group2.id);

    // avatar update shouldn't be triggered since it's been less than a week since the last check
    assert(groupAvatarUpdaterStub.notCalled);
  });
});
