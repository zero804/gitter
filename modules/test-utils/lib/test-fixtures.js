"use strict";

var Promise = require('bluebird');
var debug = require('debug')('gitter:tests:test-fixtures');
var fixtureUtils = require('./fixture-utils');

var fixtureSteps = [
  require('./delete-documents'),
  require('./create-users'),
  require('./create-identities'),
  require('./create-forums'),
  require('./create-categories'),
  require('./create-topics'),
  require('./create-replies'),
  require('./create-comments'),
  require('./create-groups'),
  require('./create-troupes'),
  require('./create-messages'),
];




function createBaseFixture() {
  return {
    // TODO: deprecate these and use fixtureUtils directly
    generateEmail: fixtureUtils.generateEmail,
    generateName: fixtureUtils.generateName,
    generateUri: fixtureUtils.generateUri,
    generateUsername: fixtureUtils.generateUsername,
    generateGithubId: fixtureUtils.generateGithubId,
    generateGithubToken: fixtureUtils.generateGithubToken,
    generateGroupUri: fixtureUtils.generateGroupUri,

    cleanup: function(callback) {
      var self = this;

      var count = 0;

      return Promise.all(Object.keys(this).map(function(key) {
          var o = self[key];
          if (typeof o.remove === 'function') {
            count++;
            return o.remove();
          }
        }))
        .timeout(10000)
        .then(function() {
          debug('Removed %s items', count);
        })
        .nodeify(callback);
    }
  };
}

function createExpectedFixtures(expected) {
  if (!expected) throw new Error('Please provide a fixture')

  return Promise.try(createBaseFixture)
    .then(function(fixture) {
      return Promise.mapSeries(fixtureSteps, function(step) {
        return step(expected, fixture);
      })
      .return(fixture);
    })
}

function fixtureLoader(fixture, expected) {
  debug("Creating fixtures %j", expected);
  return function(done) {
    return createExpectedFixtures(expected)
      .then(function(data) {
         Object.keys(data).forEach(function(key) {
          fixture[key] = data[key];
         });
       })
       .asCallback(done);
   };
}

fixtureLoader.setup = function(expected) {
  var fixture = {};

  before(fixtureLoader(fixture, expected));
  after(function() {
    if (fixture.cleanup) {
      fixture.cleanup();
    }
  });

  return fixture;
};
fixtureLoader.createExpectedFixtures = createExpectedFixtures;

// TODO: deprecate these, use them from fixtureUtils
fixtureLoader.generateEmail = fixtureUtils.generateEmail;
fixtureLoader.generateGithubId = fixtureUtils.generateGithubId;
fixtureLoader.generateUri = fixtureUtils.generateUri;

fixtureLoader.GITTER_INTEGRATION_USER_SCOPE_TOKEN = '***REMOVED***';
fixtureLoader.GITTER_INTEGRATION_USERNAME = 'gitter-integration-tests';
fixtureLoader.GITTER_INTEGRATION_USER_ID = '19433197';

fixtureLoader.GITTER_INTEGRATION_COLLAB_USER_SCOPE_TOKEN = '***REMOVED***';
fixtureLoader.GITTER_INTEGRATION_COLLAB_USERNAME = 'gitter-integration-tests-collaborator';
fixtureLoader.GITTER_INTEGRATION_COLLAB_USER_ID = '20068982';

fixtureLoader.GITTER_INTEGRATION_ORG = 'gitter-integration-tests-organisation';
fixtureLoader.GITTER_INTEGRATION_ORG_ID = '19433202';
fixtureLoader.GITTER_INTEGRATION_REPO = 'public-repo-1';
fixtureLoader.GITTER_INTEGRATION_REPO_FULL = fixtureLoader.GITTER_INTEGRATION_USERNAME + '/' + fixtureLoader.GITTER_INTEGRATION_REPO;
fixtureLoader.GITTER_INTEGRATION_REPO_ID = '59505414';
fixtureLoader.GITTER_INTEGRATION_REPO2 = 'public-repo-2';
fixtureLoader.GITTER_INTEGRATION_REPO2_FULL = fixtureLoader.GITTER_INTEGRATION_USERNAME + '/' + fixtureLoader.GITTER_INTEGRATION_REPO2;
fixtureLoader.GITTER_INTEGRATION_REPO2_ID = '62724563';
fixtureLoader.GITTER_INTEGRATION_COMMUNITY = '_I-heart-cats-Test-LOL';
fixtureLoader.GITTER_INTEGRATION_ROOM = 'all-about-kitty-litter';

fixtureLoader.GITTER_INTEGRATION_REPO_WITH_COLLAB = 'gitter-integration-tests-organisation/gitter-integration-tests-organisation-repo-1';

module.exports = fixtureLoader;
