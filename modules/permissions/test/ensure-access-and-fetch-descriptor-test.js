'use strict';

var assert = require('assert');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var ensureAccessAndFetchDescriptor = require('gitter-web-permissions/lib/ensure-access-and-fetch-descriptor');

describe('ensure-access-and-fetch-descriptor #slow', function() {
  this.timeout(10000);

  fixtureLoader.disableMongoTableScans();
  fixtureLoader.ensureIntegrationEnvironment('#integrationUser1', '#integrationGitlabUser1');

  var fixture = fixtureLoader.setup({
    user1: '#integrationUser1',
    userGitlab1: '#integrationGitlabUser1'
  });

  it('should return a descriptor for type null', async () => {
    const sd = await ensureAccessAndFetchDescriptor(fixture.user1, {
      security: 'PUBLIC'
    });

    assert.deepEqual(sd, {
      type: null,
      admins: 'MANUAL',
      public: true,
      members: 'PUBLIC',
      extraMembers: [],
      extraAdmins: [fixture.user1._id]
    });
  });

  it('should throw an error if you give it an unknown type', async () => {
    try {
      await ensureAccessAndFetchDescriptor(fixture.user1, { type: 'foo' });
      assert.ok(false, 'Expected error');
    } catch (err) {
      assert.strictEqual(err.status, 400);
    }
  });

  describe('GitHub', () => {
    it('should return a descriptor for a github org if the user has access', async () => {
      const sd = await ensureAccessAndFetchDescriptor(fixture.user1, {
        type: 'GH_ORG',
        linkPath: fixtureLoader.GITTER_INTEGRATION_ORG,
        security: 'PUBLIC'
      });

      assert.deepEqual(sd, {
        type: 'GH_ORG',
        members: 'PUBLIC',
        admins: 'GH_ORG_MEMBER',
        public: true,
        linkPath: fixtureLoader.GITTER_INTEGRATION_ORG,
        externalId: fixtureLoader.GITTER_INTEGRATION_ORG_ID
      });
    });

    it('should return a descriptor for a github user if the user has access', async () => {
      const sd = await ensureAccessAndFetchDescriptor(fixture.user1, {
        type: 'GH_USER',
        linkPath: fixtureLoader.GITTER_INTEGRATION_USERNAME,
        security: 'PUBLIC'
      });

      assert.deepEqual(sd, {
        type: 'GH_USER',
        members: 'PUBLIC',
        admins: 'GH_USER_SAME',
        public: true,
        linkPath: fixtureLoader.GITTER_INTEGRATION_USERNAME,
        externalId: fixtureLoader.GITTER_INTEGRATION_USER_ID,
        extraAdmins: [] // no user id because the username matches
      });
    });

    it('should return a descriptor for a github repo if the user has access', async () => {
      const linkPath = fixtureLoader.GITTER_INTEGRATION_REPO_FULL;

      const sd = await ensureAccessAndFetchDescriptor(fixture.user1, {
        type: 'GH_REPO',
        linkPath: linkPath,
        security: 'PUBLIC'
      });

      assert.deepEqual(sd, {
        type: 'GH_REPO',
        members: 'PUBLIC',
        admins: 'GH_REPO_PUSH',
        public: true,
        linkPath: linkPath,
        externalId: fixtureLoader.GITTER_INTEGRATION_REPO_ID
      });
    });

    it('should return a descriptor for an unknown github owner if the user has access', async () => {
      // suppose you don't know if linkPath is an org or user and you're just
      // upserting a group for it
      const linkPath = fixtureLoader.GITTER_INTEGRATION_ORG;

      const sd = await ensureAccessAndFetchDescriptor(fixture.user1, {
        type: 'GH_GUESS',
        linkPath: linkPath,
        security: 'PUBLIC'
      });

      assert.deepEqual(sd, {
        type: 'GH_ORG',
        members: 'PUBLIC',
        admins: 'GH_ORG_MEMBER',
        public: true,
        linkPath: linkPath,
        externalId: fixtureLoader.GITTER_INTEGRATION_ORG_ID
      });
    });

    it('should throw an error if the returned github type does not match as expected', async () => {
      try {
        await ensureAccessAndFetchDescriptor(fixture.user1, {
          type: 'GH_ORG',
          linkPath: fixtureLoader.GITTER_INTEGRATION_REPO_FULL,
          security: 'PUBLIC'
        });

        assert.ok(false, 'Expected error');
      } catch (err) {
        assert.strictEqual(err.status, 400);
      }
    });

    it('should throw an error if the user does not have access', async () => {
      try {
        await ensureAccessAndFetchDescriptor(fixture.user1, {
          type: 'GH_ORG',
          linkPath: 'gitterHQ',
          security: 'PUBLIC'
        });

        assert.ok(false, 'Expected error');
      } catch (err) {
        assert.strictEqual(err.status, 403);
      }
    });

    it('should throw an error if the github object does not exist', async () => {
      try {
        await ensureAccessAndFetchDescriptor(fixture.user1, {
          type: 'GH_ORG',
          linkPath: 'foo-foo-does-not-exist',
          security: 'PUBLIC'
        });

        assert.ok(false, 'Expected error');
      } catch (err) {
        assert.strictEqual(err.status, 404);
      }
    });
  });

  describe('GitLab', () => {
    it('should return a descriptor for a GitLab group if the user has access', async () => {
      const sd = await ensureAccessAndFetchDescriptor(fixture.userGitlab1, {
        type: 'GL_GROUP',
        linkPath: fixtureLoader.GITLAB_GROUP1_URI,
        security: 'PUBLIC'
      });

      assert.deepEqual(sd, {
        type: 'GL_GROUP',
        members: 'PUBLIC',
        admins: 'GL_GROUP_MAINTAINER',
        public: true,
        linkPath: fixtureLoader.GITLAB_GROUP1_URI,
        externalId: fixtureLoader.GITLAB_GROUP1_ID
      });
    });

    it('should throw an error if the returned GitLab type does not match as expected', async () => {
      try {
        await ensureAccessAndFetchDescriptor(fixture.userGitlab1, {
          type: 'GL_GROUP',
          linkPath: fixtureLoader.GITLAB_USER_USERNAME,
          security: 'PUBLIC'
        });

        assert.ok(false, 'Expected error');
      } catch (err) {
        assert.strictEqual(err.status, 400);
      }
    });

    it('should throw an error if the user does not have access', async () => {
      try {
        await ensureAccessAndFetchDescriptor(fixture.userGitlab1, {
          type: 'GL_GROUP',
          linkPath: 'gitlab-org/gitter',
          security: 'PUBLIC'
        });

        assert.ok(false, 'Expected error');
      } catch (err) {
        assert.strictEqual(err.status, 403);
      }
    });

    it('should throw an error if the GitLab object does not exist', async () => {
      try {
        await ensureAccessAndFetchDescriptor(fixture.userGitlab1, {
          type: 'GL_GROUP',
          linkPath: 'foo-foo-does-not-exist',
          security: 'PUBLIC'
        });

        assert.ok(false, 'Expected error');
      } catch (err) {
        assert.strictEqual(err.status, 404);
      }
    });
  });
});
