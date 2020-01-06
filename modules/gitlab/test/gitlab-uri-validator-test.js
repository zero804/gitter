'use strict';

const assert = require('assert');
const validateGitlabUri = require('gitter-web-gitlab').GitLabUriValidator;
const fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');

describe('gitlab-uri-validator #slow #gitlab', function() {
  fixtureLoader.ensureIntegrationEnvironment('#integrationGitlabUser1');

  const fixture = fixtureLoader.setup({
    userGitlab1: '#integrationGitlabUser1'
  });

  it('validate real group', async () => {
    const gitlabInfo = await validateGitlabUri(fixture.userGitlab1, 'gitlab-org/gitter');
    assert(gitlabInfo);
    assert.strictEqual(gitlabInfo.type, 'GROUP');
    assert.strictEqual(gitlabInfo.uri, 'gitlab-org/gitter');
    assert.strictEqual(gitlabInfo.externalId, 1540914);
  });

  it('validate real user', async () => {
    const gitlabInfo = await validateGitlabUri(fixture.userGitlab1, 'gitter-badger');
    assert.deepEqual(gitlabInfo, {
      description: 'Gitter Badger',
      externalId: 1577466,
      type: 'USER',
      uri: 'gitter-badger'
    });
  });

  // TODO: GL_PROJECT
  it('validate real project');

  it('validate nonexistant group', async () => {
    const gitlabInfo = await validateGitlabUri(fixture.userGitlab1, 'foo-foo-does-not-exist');
    assert(!gitlabInfo);
  });

  // TODO: GL_PROJECT
  it('validate nonexistant repo');
});
