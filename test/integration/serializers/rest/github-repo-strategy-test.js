"use strict";

var testRequire = require('../../test-require');
var assertUtils = testRequire('./utils/assert-utils')
var fixtureLoader = require('../../test-fixtures');
var serialize = testRequire('./serializers/serialize');
var GithubRepoStrategy = testRequire('./serializers/rest/github-repo-strategy');


describe('GithubRepoStrategy', function() {
  var blockTimer = require('../../block-timer');
  before(blockTimer.on);
  after(blockTimer.off);

  var fixture = {};
  before(fixtureLoader(fixture, {
    user1: {},
    troupe1: {
      users: ['user1'],
      githubType: 'REPO',
      security: 'PUBLIC'
    }
  }));

  after(function() {
    return fixture.cleanup();
  });

  it('should serialize a repo that does not have a room', function() {
    var repo = {
      id: 1,
      full_name: 'abc_/123',
      description: 'do re me',
      private: false,
      owner: {
        avatar_url: 'https://github.com/images/error/octocat_happy.gif',
      }
    };

    var strategy = new GithubRepoStrategy({ });
    return serialize([repo], strategy)
      .then(function(s) {
        assertUtils.assertSerializedEqual(s, [{
          id: repo.id,
          name: repo.full_name,
          description: repo.description,
          uri: repo.full_name,
          private: false,
          exists: false,
          avatar_url: repo.owner.avatar_url
        }]);
      });
  });

  it('should serialize a repo that has a room', function() {
    var repo = {
      id: 1,
      full_name: fixture.troupe1.uri,
      description: 'this one has a room',
      private: false,
      owner: {
        avatar_url: 'https://github.com/images/error/octocat_happy.gif',
      }
    };

    var t = fixture.troupe1;

    var strategy = new GithubRepoStrategy({ });
    return serialize([repo], strategy)
      .then(function(s) {
        assertUtils.assertSerializedEqual(s, [{
          id: repo.id,
          name: repo.full_name,
          description: repo.description,
          uri: repo.full_name,
          private: false,
          room: {
            id: t.id,
            name: t.uri,
            topic: '',
            uri: t.uri,
            // NOTE: Why false here, but undefined in troupe-strategy-test.js?
            // Probably because it is being loaded from the database by
            // GithubRepoStrategy's preload whereas in the troupe strategy
            // tests it comes straight from the fixture.
            oneToOne: false,
            userCount: 1,
            url: '/' + t.uri,
            githubType: 'REPO',
            security: 'PUBLIC',
            noindex: false,
            v: 1
          },
          exists: true,
          avatar_url: repo.owner.avatar_url
        }]);
      });
  });
});

