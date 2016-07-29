"use strict";

var testRequire = require('../../test-require');
var assertUtils = require('../../assert-utils')
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var serialize = testRequire('./serializers/serialize');
var GithubOrgStrategy = testRequire('./serializers/rest/github-org-strategy');


describe('GithubOrgStrategy', function() {
  var blockTimer = require('../../block-timer');
  before(blockTimer.on);
  after(blockTimer.off);

  var fixture = {};
  before(fixtureLoader(fixture, {
    user1: {},
    troupe1: {
      users: ['user1'],
      githubType: 'ORG',
      security: 'PUBLIC'
    }
  }));

  after(function() {
    return fixture.cleanup();
  });

  it('should serialize an org with no room', function() {
    var org = {
      id: 1,
      login: 'foo',
      avatar_url: 'https://github.com/images/error/octocat_happy.gif'
    };

    var strategy = new GithubOrgStrategy({ });
    return serialize([org], strategy)
      .then(function(s) {
        assertUtils.assertSerializedEqual(s, [{
          id: org.id,
          name: org.login,
          avatar_url: org.avatar_url,
          room: null,
          premium: false
        }]);
      });
  });

  it('should serialize an org with a room', function() {
    var org = {
      id: 1,
      login: fixture.troupe1.uri,
      avatar_url: 'https://github.com/images/error/octocat_happy.gif'
    };

    var t = fixture.troupe1;

    var strategy = new GithubOrgStrategy({ });
    return serialize([org], strategy)
      .then(function(s) {
        assertUtils.assertSerializedEqual(s, [{
          id: org.id,
          name: org.login,
          avatar_url: org.avatar_url,
          room: {
            id: t.id,
            name: t.uri,
            topic: '',
            uri: t.uri,
            oneToOne: false,
            userCount: 1,
            url: '/' + t.uri,
            githubType: 'ORG',
            security: 'PUBLIC',
            noindex: false,
            public: true,
            v: 1
          },
          premium: false
        }]);
      });
  });
});
