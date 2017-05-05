'use strict';

var env = require('gitter-web-env');
var config = env.config;

var integrationFixtures = {};

integrationFixtures.GITTER_INTEGRATION_USER_SCOPE_TOKEN = config.get('integrationTests:test_user:user_scope_token') || '';
integrationFixtures.GITTER_INTEGRATION_USERNAME = config.get('integrationTests:test_user:username') || '';
integrationFixtures.GITTER_INTEGRATION_USER_ID = config.get('integrationTests:test_user:user_id') || '';

integrationFixtures.GITTER_INTEGRATION_COLLAB_USER_SCOPE_TOKEN = config.get('integrationTests:collab_user:user_scope_token') || '';
integrationFixtures.GITTER_INTEGRATION_COLLAB_USERNAME = config.get('integrationTests:collab_user:username') || '';
integrationFixtures.GITTER_INTEGRATION_COLLAB_USER_ID = config.get('integrationTests:collab_user:user_id') || '';

integrationFixtures.GITTER_INTEGRATION_ORG = config.get('integrationTests:org1:org_name') || '';
integrationFixtures.GITTER_INTEGRATION_ORG_ID = config.get('integrationTests:org1:org_id') || '';
integrationFixtures.GITTER_INTEGRATION_REPO = config.get('integrationTests:repo1:repo_name') || '';
integrationFixtures.GITTER_INTEGRATION_REPO_FULL = integrationFixtures.GITTER_INTEGRATION_USERNAME + '/' + integrationFixtures.GITTER_INTEGRATION_REPO;
integrationFixtures.GITTER_INTEGRATION_REPO_ID = config.get('integrationTests:repo1:repo_id') || '';

integrationFixtures.GITTER_INTEGRATION_REPO2 = config.get('integrationTests:repo2:repo_name') || '';
integrationFixtures.GITTER_INTEGRATION_REPO2_FULL = integrationFixtures.GITTER_INTEGRATION_USERNAME + '/' + integrationFixtures.GITTER_INTEGRATION_REPO2;
integrationFixtures.GITTER_INTEGRATION_REPO2_ID = config.get('integrationTests:repo2:repo_id') || '';

integrationFixtures.GITTER_INTEGRATION_COMMUNITY = '_I-heart-cats-Test-LOL';
integrationFixtures.GITTER_INTEGRATION_ROOM = 'all-about-kitty-litter';

integrationFixtures.GITTER_INTEGRATION_REPO_WITH_COLLAB = config.get('integrationTests:collabRepos:repo1') || '';
integrationFixtures.GITTER_INTEGRATION_REPO_WITH_COLLAB2 = config.get('integrationTests:collabRepos:repo2') || '';
integrationFixtures.GITTER_INTEGRATION_REPO_WITH_COLLAB_ONLY_READ = config.get('integrationTests:collabRepos:repoReadOnly') || '';

module.exports = integrationFixtures;
