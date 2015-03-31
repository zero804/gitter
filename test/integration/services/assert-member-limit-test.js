/*jslint node: true, unused:true */
/*global describe:true, it: true */
"use strict";

var testRequire = require('../test-require');
var Q = require('q');
var assert = require('assert');
var FAKE_USER = { id: 'superfake' };

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
    Subscription: { findOneQ: function() { return Q.resolve(subscritionFindResult); } }
  }
});

describe('assert-member-limit:', function() {

  beforeEach(function() {
    subscritionFindResult = null;
  });

  describe('user room', function() {

    it('allows user to join public room', function(done) {
      var room = {
        uri: 'user/room',
        security: 'PUBLIC',
        users: createArray(100)
      };

      assertMemberLimit(room, FAKE_USER).nodeify(done);
    });

    it('allows user to join private room', function(done) {
      var room = {
        uri: 'user/room',
        security: 'PRIVATE',
        users: createArray(100)
      };

      assertMemberLimit(room, FAKE_USER).nodeify(done);
    });

  });

  describe('org room', function() {

    it('allows user to join public room', function(done) {
      var room = {
        uri: 'org/room',
        security: 'PUBLIC',
        users: createArray(26)
      };

      assertMemberLimit(room, FAKE_USER).nodeify(done);
    });

    it('allows user to join private room with 0 people in the org', function(done) {
      var room = {
        uri: 'org/room',
        security: 'PRIVATE',
        users: createArray(0)
      };

      assertMemberLimit(room, FAKE_USER).nodeify(done);
    });

    it('allows undefined user to join private room with 10 people inside', function(done) {
      var room = {
        uri: 'org/room',
        security: 'PRIVATE',
        users: createArray(10)
      };

      assertMemberLimit(room, undefined).nodeify(done);
    });

    it('allows user to join private room with 24 people inside', function(done) {
      var room = {
        uri: 'org/room',
        security: 'PRIVATE',
        users: createArray(24)
      };

      assertMemberLimit(room, FAKE_USER).nodeify(done);
    });

    it('throws when user tries to join private room with 25 other people inside', function(done) {
      var room = {
        uri: 'org/room',
        security: 'PRIVATE',
        users: createArray(25)
      };

      assertMemberLimit(room, FAKE_USER)
        .then(function() {
          done(new Error('exception not thrown'));
        }, function(err) {
          assert(err);
          assert.equal(err.status, 402);
          done();
        });
    });

    it('throws when user tries to join inherited room with 25 other people inside', function(done) {
      var room = {
        uri: 'org/room',
        security: 'INHERITED',
        users: createArray(25)
      };

      assertMemberLimit(room, FAKE_USER)
        .then(function() {
          done(new Error('exception not thrown'));
        }, function(err) {
          assert(err);
          assert.equal(err.status, 402);
          done();
        });
    });

    it('throws when user tries to join room with undefined security with 25 other people inside', function(done) {
      var room = {
        uri: 'org/room',
        users: createArray(25)
      };

      assertMemberLimit(room, FAKE_USER)
        .then(function() {
          done(new Error('exception not thrown'));
        }, function(err) {
          assert(err);
          assert.equal(err.status, 402);
          done();
        });
    });

    it('allows existing org user to join private room with 25 people inside', function(done) {
      var users = createArray(25);
      users.push({ userId: FAKE_USER.id });

      var room = {
        uri: 'org/room',
        security: 'PRIVATE',
        users: users
      };

      assertMemberLimit(room, FAKE_USER).nodeify(done);
    });

    it('allows user to join private room with 25 people in the org with paid plan', function(done) {
      subscritionFindResult = { _id: 'im a subscription!' };

      var room = {
        uri: 'org/room',
        security: 'PRIVATE',
        users: createArray(25)
      };

      assertMemberLimit(room, FAKE_USER).nodeify(done);
    });

  });

  describe('repo room with no clear owner', function() {

    it('allows user to join public room', function(done) {
      var room = {
        uri: 'xxx/room',
        security: 'PUBLIC',
        users: createArray(100)
      };

      assertMemberLimit(room, FAKE_USER).nodeify(done);
    });

    it('allows user to join private room', function(done) {
      var room = {
        uri: 'xxx/room',
        security: 'PRIVATE',
        users: createArray(100)
      };

      assertMemberLimit(room, FAKE_USER).nodeify(done);
    });

  });

});

function createArray(userCount) {
  var array = [];
  for (var i = 0; i < userCount; i++) {
    array.push({ userId: 'user' + i });
  }

  return array;
}
