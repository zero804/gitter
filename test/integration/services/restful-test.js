'use strict';

var testRequire = require('../test-require');
var restful = testRequire('./services/restful');
var userService = testRequire('gitter-web-users');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var assert = require('assert');
var env = require('gitter-web-env');
var nconf = env.config;
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var moment = require('moment');

var counter = 0;

// identities need providerKey and it has to be unique
function generateId() {
  return '' + ++counter + Date.now();
}

// for some tests it specifically has to be a github user
function generateGithubUsername() {
  return 'github' + ++counter + Date.now();
}

// I need to make sure that a gitter user that is a github user returns the
// right stuff and therefore I have to make sure that a gitter account exists
// for a github account that is known to exist. But I can't just hack the
// fixtures because it will fail if you try and create the user and it already
// exists and if your tests ever fail, then it won't be cleaned up, so next
// time around it will throw an error when it tries to create it.
var hardcodedGitHubUser = {
  githubId: 69737,
  username: 'lerouxb',
  displayName: 'Le Roux Bodenstein'
};
// this can only come from github has we don't store it in the db. If I ever
// change my location, then our tests will break ;)
var hardcodedLocation = 'Cape Town';
function ensureGitHubUser(options) {
  return userService.findOrCreateUserForGithubId(options);
}

// Make sure things is an array of objects with mongo ids matching the passed
// in ids exactly in order. Useful for making sure a set of search results
// match exactly what you expected.
function matchIds(things, ids) {
  if (things.length !== ids.length) return false;

  return things.every(function(thing, index) {
    var thingId = thing._id || thing.id;
    var id = ids[index];
    return mongoUtils.objectIDsEqual(thingId, id);
  });
}

describe('restful #slow', function() {
  fixtureLoader.ensureIntegrationEnvironment('#integrationUser1');

  var fixture = fixtureLoader.setup({
    // user1 is a google (non-github) user
    user1: '#integrationUser1',
    identity1: {
      user: 'user1',
      provider: 'google',
      providerKey: generateId()
    },
    // user2 is a github-backed user that doesn't actually exist on github
    // (which is only useful in testing edge cases)
    user2: {
      id: 2,
      username: generateGithubUsername()
    },
    group1: {},
    troupe1: {
      group: 'group1',
      users: ['user1']
    }
  });

  it('returns a github-backed profile #slow', function() {
    return ensureGitHubUser(hardcodedGitHubUser)
      .then(function() {
        return restful.serializeProfileForUsername(hardcodedGitHubUser.username);
      })
      .then(function(profile) {
        assert(profile.id);
        assert.equal(profile.username, hardcodedGitHubUser.username);
        assert.equal(profile.displayName, hardcodedGitHubUser.displayName);
        assert.equal(profile.location, hardcodedLocation);
      });
  });

  it('returns a google-backed profile', function() {
    return restful.serializeProfileForUsername(fixture.user1.username).then(function(profile) {
      assert(profile.id);
      assert.equal(profile.username, fixture.user1.username);
      assert.equal(profile.displayName, fixture.user1.displayName);
    });
  });

  it('returns a github user that is not on gitter yet #slow', function() {
    // this will be useless if defunkt ever manages to get an account on our
    // test environment..
    return restful.serializeProfileForUsername('defunkt').then(function(profile) {
      // github-only users don't have github ids
      assert(!profile.id);
      assert(profile.username);
      assert(profile.displayName);
      // github-only users get the avatar url from their API rather than our DB
      assert(profile.gravatarImageUrl);
      // assuming this is never 0 ;)
      assert(profile.github.followers);
    });
  });

  // github users that don't exist in our db will be checked against github
  it('returns a 404 for a github user that does not exist on github #slow', function() {
    return restful.serializeProfileForUsername(fixture.user2.username).then(
      function() {
        assert.ok(false, 'Expected a throw');
      },
      function(err) {
        assert.strictEqual(err.status, 404);
      }
    );
  });

  // non-github users that don't exist in our db don't get any further
  // processing
  it('returns a 404 for a google user that does not exist in our database', function() {
    return restful.serializeProfileForUsername('thisshouldnotexist_google').then(
      function() {
        assert.ok(false, 'Expected a throw');
      },
      function(err) {
        assert.strictEqual(err.status, 404);
      }
    );
  });

  it('serializes orgs', function() {
    return restful.serializeOrgsForUserId(fixture.user1.id);
  });

  it('serializes orgs', function() {
    return restful.serializeOrgsForUserId(fixture.user1.id);
  });

  describe('serializeGroupsForUserId', function() {
    it('should do what it says on the tin', function() {
      return restful.serializeGroupsForUserId(fixture.user1.id).then(function(result) {
        var group1 = fixture.group1;

        assert.deepEqual(result, [
          {
            id: group1.id,
            name: group1.name,
            uri: group1.uri,
            homeUri: group1.homeUri,
            backedBy: {
              type: null,
              linkPath: null
            },
            avatarUrl: nconf.get('avatar:officialHost') + '/group/i/' + group1.id,
            hasAvatarSet: undefined,
            favourite: undefined
          }
        ]);
      });
    });
  });

  describe('serializeAdminGroupsForUser', function() {
    it('should do what it says on the tin', function() {
      return restful.serializeAdminGroupsForUser(fixture.user1).then(function(result) {
        assert.deepEqual(result, []);
      });
    });
  });

  describe('serializeRoomsForGroupId', function() {
    var fixture = fixtureLoader.setup({
      group1: {},
      user1: {},
      troupe1: { group: 'group1', users: ['user1'] },
      troupe2: { group: 'group1', security: 'PRIVATE' }
    });

    it('should serialize the rooms for a group', function() {
      return restful
        .serializeRoomsForGroupId(fixture.group1._id, fixture.user1._id)
        .then(function(result) {
          assert.strictEqual(result.length, 1);
          var v1 = result[0];
          assert.strictEqual(v1.roomMember, true);
        });
    });
  });
});
