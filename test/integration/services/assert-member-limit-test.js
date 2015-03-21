/*jslint node: true, unused:true */
/*global describe:true, it: true */
"use strict";

var testRequire = require('../test-require');
var Q = require('q');
var assert = require('assert');
var FAKE_USER = { id: 'superfake' };

var orgMembers = [];
var subscritionFindResult;

var assertMemberLimit = testRequire.withProxies('./services/assert-member-limit', {
  './troupe-service': {
    findByUri: function(uri) {
      if (uri === 'org') {
        return Q.resolve({ githubType: 'ORG' });
      } else if (uri === 'user') {
        return Q.resolve({ githubType: 'NOT_ORG' });
      } else {
        return Q.resolve();
      }
    }
  },
  './persistence-service': {
    Troupe: { aggregateQ: function() { return Q.resolve(orgMembers); } },
    Subscription: { findOneQ: function() { return Q.resolve(subscritionFindResult); } }
  }
});

describe('assert-member-limit:', function() {

  describe('user room', function() {

    it('allows user to join public room', function(done) {
      assertMemberLimit('user/room', 'PUBLIC', FAKE_USER).nodeify(done);
    });

    it('allows user to join private room', function(done) {
      assertMemberLimit('user/room', 'PRIVATE', FAKE_USER).nodeify(done);
    });

  });

  describe('org room', function() {

    beforeEach(function() {
      orgMembers = [];
      subscritionFindResult = null;
    });

    it('allows user to join public room', function(done) {
      assertMemberLimit('user/room', 'PUBLIC', FAKE_USER).nodeify(done);
    });

    it('allows user to join private room with 0 people in the org', function(done) {
      orgMembers = [];
      assertMemberLimit('org/room', 'PRIVATE', FAKE_USER).nodeify(done);
    });

    it('allows undefined user to join private room with 10 people in the org', function(done) {
      orgMembers = createArray(10);
      assertMemberLimit('org/room', 'PRIVATE', FAKE_USER).nodeify(done);
    });

    it('allows user to join private room with 24 people in the org', function(done) {
      orgMembers = createArray(24);
      assertMemberLimit('org/room', 'PRIVATE', FAKE_USER).nodeify(done);
    });

    it('throws when user tries to join private room with 25 other people in the org', function(done) {
      orgMembers = createArray(25);

      assertMemberLimit('org/room', 'PRIVATE', FAKE_USER)
        .then(function() {
          done(new Error('exception not thrown'));
        }, function(err) {
          assert(err);
          assert.equal(err.status, 402);
          done();
        });
    });

    it('allows existing org user to join private room with 25 people in the org', function(done) {
      orgMembers = createArray(24);
      orgMembers.push({ _id: FAKE_USER.id });

      assertMemberLimit('org/room', 'PRIVATE', FAKE_USER).nodeify(done);
    });

    it('allows user to join private room with 25 people in the org with paid plan', function(done) {
      orgMembers = createArray(25);
      subscritionFindResult = { _id: 'im a subscription!' };

      assertMemberLimit('org/room', 'PRIVATE', FAKE_USER).nodeify(done);
    });

  });

  describe('repo room with no clear owner', function() {

    it('allows user to join public room', function(done) {
      assertMemberLimit('xxx/room', 'PUBLIC', FAKE_USER).nodeify(done);
    });

    it('allows user to join private room', function(done) {
      assertMemberLimit('xxx/room', 'PRIVATE', FAKE_USER).nodeify(done);
    });

  });

});

function createArray(userCount) {
  var array = [];
  for (var i = 0; i < userCount; i++) {
    array.push({ _id: 'user' + i });
  }

  return array;
}
