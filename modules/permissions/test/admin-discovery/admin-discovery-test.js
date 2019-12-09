'use strict';

const assert = require('assert');
const fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
const proxyquireNoCallThru = require('proxyquire').noCallThru();

describe('admin-discovery', () => {
  describe('integration tests #slow', () => {
    fixtureLoader.disableMongoTableScans();

    let adminDiscovery;
    let githubOrgs;
    let gitlabGroups;
    let URI = fixtureLoader.generateUri();

    const fixture = fixtureLoader.setup({
      userGithub1: {},
      userGithub2: {},
      groupGithub1: {
        securityDescriptor: {
          type: 'GH_ORG',
          members: 'PUBLIC',
          admins: 'GH_ORG_MEMBER',
          public: true,
          linkPath: URI,
          externalId: 'fakeExternalId3',
          extraAdmins: ['userGithub1']
        }
      },

      userGitlab1: {},
      userGitlab2: {},
      identityGitlab1: {
        user: 'userGitlab1',
        provider: 'gitlab',
        providerKey: fixtureLoader.generateGithubId()
      },
      identityGitlab2: {
        user: 'userGitlab2',
        provider: 'gitlab',
        providerKey: fixtureLoader.generateGithubId()
      },
      groupGitlab1: {
        securityDescriptor: {
          type: 'GL_GROUP',
          members: 'PUBLIC',
          admins: 'GL_GROUP_MAINTAINER',
          public: true,
          linkPath: URI,
          externalId: 'fakeExternalId3',
          extraAdmins: ['userGitlab1']
        }
      },

      deleteDocuments: {
        Group: [
          { 'sd.type': 'GH_ORG', 'sd.externalId': 'fakeExternalId3' },
          { 'sd.type': 'GL_GROUP', 'sd.externalId': 'fakeExternalId3' }
        ]
      }
    });

    beforeEach(() => {
      githubOrgs = null;
      gitlabGroups = null;
      adminDiscovery = proxyquireNoCallThru('../../lib/admin-discovery/index', {
        './gitlab-group': async () => {
          return gitlabGroups;
        },
        './github-org': async () => {
          return githubOrgs;
        }
      });
    });

    describe('discoverAdminGroups', () => {
      describe('GitLab', () => {
        it('should return nothing for users who are not admins of any groups', async () => {
          const groups = await adminDiscovery.discoverAdminGroups(fixture.userGitlab2);
          assert.deepEqual(groups, []);
        });

        it('should return groups where user can admin based on GitLab group URL', async () => {
          gitlabGroups = {
            type: 'GL_GROUP',
            linkPath: [URI]
          };

          const groups = await adminDiscovery.discoverAdminGroups(fixture.userGitlab2);
          assert.strictEqual(groups.length, 1);
          assert.strictEqual(String(groups[0]._id), String(fixture.groupGitlab1._id));
        });

        it('should return groups where user can admin based on GitLab group ID', async () => {
          gitlabGroups = {
            type: 'GL_GROUP',
            externalId: 'fakeExternalId3'
          };

          const groups = await adminDiscovery.discoverAdminGroups(fixture.userGitlab2);
          assert.strictEqual(groups.length, 1);
          assert.strictEqual(String(groups[0]._id), String(fixture.groupGitlab1._id));
        });

        it('should return rooms where the user is in extraAdmins', async () => {
          const groups = await adminDiscovery.discoverAdminGroups(fixture.userGitlab1);
          assert.strictEqual(groups.length, 1);
          assert.strictEqual(String(groups[0]._id), String(fixture.groupGitlab1._id));
        });

        it('should return rooms where the user is in extraAdmins and a group maintainer without dups', async () => {
          gitlabGroups = {
            type: 'GL_GROUP',
            linkPath: [URI]
          };

          const groups = await adminDiscovery.discoverAdminGroups(fixture.userGitlab1);
          assert.strictEqual(groups.length, 1);
          assert.strictEqual(String(groups[0]._id), String(fixture.groupGitlab1._id));
        });
      });

      describe('GitHub', () => {
        it('should return nothing for users who are not admins of any groups', async () => {
          const groups = await adminDiscovery.discoverAdminGroups(fixture.userGithub2);
          assert.deepEqual(groups, []);
        });

        it('should return groups where user can admin based on GitHub org URL', async () => {
          githubOrgs = {
            type: 'GH_ORG',
            linkPath: [URI]
          };

          const groups = await adminDiscovery.discoverAdminGroups(fixture.userGithub2);
          assert.strictEqual(groups.length, 1);
          assert.strictEqual(String(groups[0]._id), String(fixture.groupGithub1._id));
        });

        it('should return groups where user can admin based on GitHub org ID', async () => {
          githubOrgs = {
            type: 'GH_ORG',
            externalId: 'fakeExternalId3'
          };

          const groups = await adminDiscovery.discoverAdminGroups(fixture.userGithub2);
          assert.strictEqual(groups.length, 1);
          assert.strictEqual(String(groups[0]._id), String(fixture.groupGithub1._id));
        });

        it('should return rooms where the user is in extraAdmins', async () => {
          const groups = await adminDiscovery.discoverAdminGroups(fixture.userGithub1);
          assert.strictEqual(groups.length, 1);
          assert.strictEqual(String(groups[0]._id), String(fixture.groupGithub1._id));
        });

        it('should return rooms where the user is in extraAdmins and an org member without dups', async () => {
          githubOrgs = {
            type: 'GH_ORG',
            linkPath: [URI]
          };

          const groups = await adminDiscovery.discoverAdminGroups(fixture.userGithub1);
          assert.strictEqual(groups.length, 1);
          assert.strictEqual(String(groups[0]._id), String(fixture.groupGithub1._id));
        });
      });
    });
  });
});
