'use strict';

const Promise = require('bluebird');
const assert = require('assert');
const proxyquireNoCallThru = require('proxyquire').noCallThru();
const fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');

describe('gitlab-group-service #flakey #slow #gitlab', function() {
  // These tests timeout at 10000 sometimes otherwise
  this.timeout(30000);

  fixtureLoader.ensureIntegrationEnvironment(
    'GITLAB_USER_USERNAME',
    'GITLAB_USER_TOKEN',
    'GITLAB_PUBLIC_PROJECT1_URI',
    'GITLAB_PRIVATE_PROJECT1_URI',
    'GITLAB_UNAUTHORIZED_PRIVATE_PROJECT1_URI'
  );

  const FAKE_USER = {
    username: 'FAKE_USER'
  };

  let oauthToken = null;
  let GitLabGroupService;

  beforeEach(() => {
    GitLabGroupService = proxyquireNoCallThru('../lib/group-service', {
      './get-gitlab-access-token-from-user': function() {
        return Promise.resolve(oauthToken);
      }
    });
  });

  afterEach(() => {
    oauthToken = null;
  });

  describe('as a GitLab user', () => {
    beforeEach(() => {
      oauthToken = fixtureLoader.GITLAB_USER_TOKEN;
    });

    it('should fetch groups', async () => {
      const glService = new GitLabGroupService(FAKE_USER);
      const groups = await glService.getGroups();
      assert(groups.length > 0);
      groups.forEach(group => {
        assert.strictEqual(group.backend, 'gitlab', 'group has not gone through the standardized');
      });
    });

    it('should fetch group', () => {
      const glService = new GitLabGroupService(FAKE_USER);
      return glService.getGroup('gitter-integration-tests-group').then(group => {
        assert.equal(group.backend, 'gitlab', 'group has not gone through the standardized');
        assert.equal(group.name, 'gitter-integration-tests-group');
      });
    });
  });
});
