'use strict';

var testRequire = require('../../test-require');
var assertUtils = require('../../assert-utils');
var env = require('gitter-web-env');
var nconf = env.config;
var getOrgNameFromUri = require('gitter-web-shared/get-org-name-from-uri');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var serialize = require('gitter-web-serialization/lib/serialize');
var GitlabProjectStrategy = testRequire('./serializers/rest/gitlab-project-strategy');

describe('GitlabProjectStrategy', function() {
  var blockTimer = require('gitter-web-test-utils/lib/block-timer');
  before(blockTimer.on);
  after(blockTimer.off);

  const fixture = fixtureLoader.setup({
    troupe1: {
      securityDescriptor: {
        type: 'GL_PROJECT',
        members: 'PUBLIC',
        admins: 'GL_PROJECT_MAINTAINER',
        public: true,
        linkPath: 'does-not-exist/some-test-project',
        externalId: 1234567890
      }
    }
  });

  it('should serialize a GitLab project that does not have a room', function() {
    const gitlabProject = {
      type: 'GL_PROJECT',
      id: 7616684,
      name: 'public-project1',
      description: '',
      absoluteUri: 'https://gitlab.com/gitter-integration-tests-group/public-project1',
      uri: 'gitter-integration-tests-group/public-project1',
      private: false,
      avatar_url:
        'https://assets.gitlab-static.net/uploads/-/system/project/avatar/7616684/test-avatar-project-1.png'
    };

    const strategy = new GitlabProjectStrategy({});
    return serialize([gitlabProject], strategy).then(function(s) {
      assertUtils.assertSerializedEqual(s, [
        {
          type: 'GL_PROJECT',
          id: 7616684,
          name: 'public-project1',
          description: '',
          absoluteUri: 'https://gitlab.com/gitter-integration-tests-group/public-project1',
          uri: 'gitter-integration-tests-group/public-project1',
          private: false,
          avatar_url:
            'https://assets.gitlab-static.net/uploads/-/system/project/avatar/7616684/test-avatar-project-1.png'
        }
      ]);
    });
  });

  it('should serialize a GitLab project that has a room', function() {
    const gitlabProject = {
      type: 'GL_PROJECT',
      id: 1234567890,
      name: 'some-test-project',
      absoluteUri: 'https://gitlab.com/does-not-exist/some-test-project',
      uri: 'does-not-exist/some-test-project'
    };

    const room = fixture.troupe1;

    var strategy = new GitlabProjectStrategy({});
    return serialize([gitlabProject], strategy).then(function(s) {
      assertUtils.assertSerializedEqual(s, [
        {
          type: 'GL_PROJECT',
          id: 1234567890,
          name: 'some-test-project',
          absoluteUri: 'https://gitlab.com/does-not-exist/some-test-project',
          uri: 'does-not-exist/some-test-project',
          room: {
            id: room.id,
            name: room.uri,
            topic: room.topic,
            avatarUrl: nconf.get('avatar:officialHost') + '/gh/u/' + getOrgNameFromUri(room.uri),
            uri: room.uri,
            oneToOne: false,
            userCount: 0,
            url: '/' + room.uri,
            githubType: 'ORG',
            security: 'PUBLIC',
            noindex: false,
            public: true,
            meta: {},
            v: 1
          }
        }
      ]);
    });
  });
});
