"use strict";

var testRequire = require('../test-require');
var Promise = require('bluebird');
var assert = require('assert');
var FAKE_USER = { id: 'superfake' };

var subscritionFindResult, countUsersInRoomResult, checkRoomMembershipResult;

var assertMemberLimit = testRequire.withProxies('./services/assert-member-limit', {
  './troupe-service': {
    checkGitHubTypeForUri: function(uri, githubType) {
      if (uri === 'org') {
        return Promise.resolve(githubType == 'ORG');
      } else if (uri === 'user') {
        return Promise.resolve(githubType == 'NOT_ORG');
      } else {
        return Promise.resolve(false);
      }
    }
  },
  './room-membership-service': {
    checkRoomMembership: function(/*troupeId, userId*/) {
      return Promise.resolve(checkRoomMembershipResult);
    },
    countMembersInRoom: function(/*troupeId*/) {
      return Promise.resolve(countUsersInRoomResult);
    }
  },
  'gitter-web-persistence': {
    Subscription: { findOne: function() { return { exec: function() { return Promise.resolve(subscritionFindResult); } }; } }
  }
});


describe('assert-member-limit:', function() {

  beforeEach(function() {
    subscritionFindResult = null;
    countUsersInRoomResult = 100;
    checkRoomMembershipResult = false;
  });

  describe('user room', function() {

    it('allows user to join public room', function(done) {
      var room = {
        uri: 'user/room',
        sd: {
          public: true
        }
      };

      assertMemberLimit(room, FAKE_USER).nodeify(done);
    });

    it('allows user to join private room', function(done) {
      var room = {
        uri: 'user/room',
        sd: {
          public: false
        }
      };


      assertMemberLimit(room, FAKE_USER).nodeify(done);
    });

  });

  describe('org room', function() {

    it('allows user to join public room', function(done) {
      var room = {
        uri: 'org/room',
        sd: {
          public: true
        }
      };
      countUsersInRoomResult = 26;
      assertMemberLimit(room, FAKE_USER).nodeify(done);
    });

    it('allows user to join private room with 0 people in the org', function(done) {
      var room = {
        uri: 'org/room',
        sd: {
          public: false
        }
      };
      countUsersInRoomResult = 0;

      assertMemberLimit(room, FAKE_USER).nodeify(done);
    });

    it('allows undefined user to join private room with 10 people inside', function(done) {
      var room = {
        uri: 'org/room',
        sd: {
          public: false
        }
      };
      countUsersInRoomResult = 10;
      assertMemberLimit(room, undefined).nodeify(done);
    });

    it('allows user to join private room with 24 people inside', function(done) {
      var room = {
        uri: 'org/room',
        sd: {
          public: false
        }
      };
      countUsersInRoomResult = 24;
      assertMemberLimit(room, FAKE_USER).nodeify(done);
    });

    it('throws when user tries to join private room with 25 other people inside', function(done) {
      var room = {
        uri: 'org/room',
        sd: {
          public: false
        }
      };
      countUsersInRoomResult = 25;

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
        sd: {
          public: false
        }
      };
      countUsersInRoomResult = 25;

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
        sd: {
          public: false
        }
      };
      countUsersInRoomResult = 25;

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
      countUsersInRoomResult = 26;
      checkRoomMembershipResult = true;

      var room = {
        uri: 'org/room',
        sd: {
          public: false
        }
      };

      assertMemberLimit(room, FAKE_USER).nodeify(done);
    });

    it('allows user to join private room with 25 people in the org with paid plan', function(done) {
      subscritionFindResult = { _id: 'im a subscription!' };
      countUsersInRoomResult = 25;

      var room = {
        uri: 'org/room',
        sd: {
          public: false
        }
      };

      assertMemberLimit(room, FAKE_USER).nodeify(done);
    });

  });

  describe('repo room with no clear owner', function() {

    it('allows user to join public room', function(done) {
      countUsersInRoomResult = 100;
      var room = {
        uri: 'xxx/room',
        sd: {
          public: true
        }
      };

      assertMemberLimit(room, FAKE_USER).nodeify(done);
    });

    it('allows user to join private room', function(done) {
      countUsersInRoomResult = 100;
      var room = {
        uri: 'xxx/room',
        sd: {
          public: false
        }
      };

      assertMemberLimit(room, FAKE_USER).nodeify(done);
    });

  });

});
