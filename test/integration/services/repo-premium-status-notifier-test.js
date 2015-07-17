'use strict';


var testRequire = require('../test-require');
var assert = require('assert');
var fixtureLoader = require('../test-fixtures');
var Q = require('q');

var repoPremiumStatusNotifier = testRequire("./services/repo-premium-status-notifier");
var fixture = {};

describe('repo-premium-status-notifier', function() {

  before(fixtureLoader(fixture, {
    user1: { },
    troupeOrg1: {
      githubType: 'ORG',
      users: ['user1', 'user2']
    }
  }));

  after(function() {
    fixture.cleanup();
  });

  it('should work with users on', function(done) {
    repoPremiumStatusNotifier(fixture.user1.username, true)
      .nodeify(done);
  });

  it('should work with users off', function(done) {
    repoPremiumStatusNotifier(fixture.user1.username, false)
      .nodeify(done);
  });

  it('should work with orgs on', function(done) {
    repoPremiumStatusNotifier('gitterHQ', true)
      .nodeify(done);
  });

  it('should work with users off', function(done) {
    repoPremiumStatusNotifier('gitterHQ', false)
      .nodeify(done);
  });

});
