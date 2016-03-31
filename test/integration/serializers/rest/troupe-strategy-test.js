"use strict";

var testRequire = require('../../test-require');
var assertUtils = testRequire('./utils/assert-utils')
var fixtureLoader = require('../../test-fixtures');
var serialize = testRequire('./serializers/serialize');
var TroupeStrategy = testRequire('./serializers/rest/troupe-strategy');


describe('TroupeStrategy', function() {
  var blockTimer = require('../../block-timer');
  before(blockTimer.on);
  after(blockTimer.off);

  var fixture = {};
  before(fixtureLoader(fixture, {
    user1: {},
    user2: {},
    troupe1: {
      users: ['user1'],
      // going with USER_CHANNEL rather than default of ORG so that some of the
      // tests below don't unnecessarily try to go down the github path.
      githubType: 'USER_CHANNEL',
      security: 'PUBLIC'
    },
    troupe2: {
      oneToOne: true,
      users: ['user1', 'user2']
    }
  }));

  after(function() {
    return fixture.cleanup();
  });

  it('should serialize a troupe', function() {
    var strategy = new TroupeStrategy({ });
    var t = fixture.troupe1;
    return serialize([t], strategy)
      .then(function(s) {
        assertUtils.assertSerializedEqual(s, [{
          id: t.id,
          name: t.uri,
          topic: '',
          uri: t.uri,
          userCount: 1,
          url: '/' + t.uri,
          githubType: 'USER_CHANNEL',
          security: 'PUBLIC',
          noindex: false,
          v: 1
        }]);
      });
  });

  it('should serialize a troupe with currentUserId', function() {
    var strategy = new TroupeStrategy({ currentUserId: fixture.user1._id});
    var t = fixture.troupe1;
    return serialize([t], strategy)
      .then(function(s) {
        assertUtils.assertSerializedEqual(s, [{
          id: t.id,
          name: t.uri,
          topic: '',
          uri: t.uri,
          userCount: 1,
          unreadItems: 0,
          mentions: 0,
          lurk: false,
          url: '/' + t.uri,
          githubType: 'USER_CHANNEL',
          security: 'PUBLIC',
          noindex: false,
          roomMember: true,
          v: 1
        }]);
      });
  });

  it('should serialize a one-to-one troupe with currentUserId', function() {
    var strategy = new TroupeStrategy({ currentUserId: fixture.user1._id});
    var u1 = fixture.user1;
    var u2 = fixture.user2;
    var t = fixture.troupe2;
    return serialize([t], strategy)
      .then(function(s) {
        assertUtils.assertSerializedEqual(s, [{
          id: t.id,
          name: u2.displayName,
          topic: '',
          uri: t.uri,
          oneToOne: true,
          userCount: 2,
          user: {
            id: u2.id,
            username: u2.username,
            displayName: u2.displayName,
            url: '/' + u2.username,
            avatarUrlSmall: '/api/private/user-avatar/'+u2.username+'?s=60',
            avatarUrlMedium: '/api/private/user-avatar/'+u2.username+'?s=128',
            staff: false,
            v: 1
          },
          unreadItems: 0,
          mentions: 0,
          lurk: false,
          url: '/' + u2.username,
          githubType: 'ONETOONE',
          noindex: false,
          roomMember: true,
          v: 1
        }]);
      });
  });

  it('should skip unread counts with currentUserId and options.skipUnreadCounts', function() {
    var strategy = new TroupeStrategy({
      currentUserId: fixture.user1._id,
      skipUnreadCounts: true
    });
    var t = fixture.troupe1;
    return serialize([t], strategy)
      .then(function(s) {
        assertUtils.assertSerializedEqual(s, [{
          id: t.id,
          name: t.uri,
          topic: '',
          uri: t.uri,
          userCount: 1,
          lurk: false,
          url: '/' + t.uri,
          githubType: 'USER_CHANNEL',
          security: 'PUBLIC',
          noindex: false,
          roomMember: true,
          v: 1
        }]);
      });
  });

  it('should include permissions with currentUser and includePermissions', function() {
    var user = fixture.user1;
    var strategy = new TroupeStrategy({
      currentUser: user,
      includePermissions: true
    });
    var t = fixture.troupe1;
    return serialize([t], strategy)
      .then(function(s) {
        assertUtils.assertSerializedEqual(s, [{
          id: t.id,
          name: t.uri,
          topic: '',
          uri: t.uri,
          userCount: 1,
          url: '/' + t.uri,
          githubType: 'USER_CHANNEL',
          security: 'PUBLIC',
          noindex: false,
          permissions: {
            /*
            NOTE: this is kinda an artifact of how our fixtures work. We get
            admin false even though the one user in there should probably be
            the admin, but that's because (at the time of writing) the uri of a
            channel room has to start with the username of the user that made
            it for the user to be admin.. I started going down the rabbit hole
            of hacking the fixtures to work but realised that at that point
            I'm not testing the strategy at all, so just leaving this comment
            here and moving on.
            */
            admin: false
          },
          v: 1
        }]);
      });
  });

  it('should include if an owner is an org with includeOwner', function() {
    var strategy = new TroupeStrategy({ includeOwner: true });
    var t = fixture.troupe1;
    return serialize([t], strategy)
      .then(function(s) {
        assertUtils.assertSerializedEqual(s, [{
          id: t.id,
          name: t.uri,
          topic: '',
          uri: t.uri,
          userCount: 1,
          url: '/' + t.uri,
          githubType: 'USER_CHANNEL',
          security: 'PUBLIC',
          noindex: false,
          ownerIsOrg: false,
          v: 1
        }]);
      });
  });

  it('should include room membership with isRoomMember', function() {
    var strategy = new TroupeStrategy({ isRoomMember: true });
    var t = fixture.troupe1;
    return serialize([t], strategy)
      .then(function(s) {
        assertUtils.assertSerializedEqual(s, [{
          id: t.id,
          name: t.uri,
          topic: '',
          uri: t.uri,
          userCount: 1,
          url: '/' + t.uri,
          githubType: 'USER_CHANNEL',
          security: 'PUBLIC',
          noindex: false,
          roomMember: true,
          v: 1
        }]);
      });
  });
});
