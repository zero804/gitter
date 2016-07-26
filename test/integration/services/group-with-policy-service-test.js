"use strict";

var testRequire = require('../test-require');
var assert = require('assert');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var Promise = require('bluebird');
var StatusError = require('statuserror');
var GroupWithPolicyService = testRequire('./services/group-with-policy-service');
var securityDescriptorService = require('gitter-web-permissions/lib/security-descriptor-service');

var isAdminPolicy = {
  canAdmin: function() {
    return Promise.resolve(true);
  },
  canJoin: function(){
    return Promise.resolve(true);
  }
};

describe('group-with-policy-service #slow', function() {
  var fixture = {};
  var group1WithPolicyService;
  var group2WithPolicyService;
  var group3WithPolicyService;

  var linkPath = fixtureLoader.GITTER_INTEGRATION_USERNAME + '/' + fixtureLoader.GITTER_INTEGRATION_REPO;

  beforeEach(function() {
    return fixtureLoader(fixture, {
        deleteDocuments: {
          User: [{ username: fixtureLoader.GITTER_INTEGRATION_USERNAME }],
          Group: [
            { lcUri: fixtureLoader.GITTER_INTEGRATION_USERNAME.toLowerCase() },
            { lcUri: fixtureLoader.GITTER_INTEGRATION_ORG.toLowerCase() },
            { lcUri: fixtureLoader.GITTER_INTEGRATION_COMMUNITY.toLowerCase() }
          ],
          Troupe: [
            { lcUri: fixtureLoader.GITTER_INTEGRATION_USERNAME.toLowerCase() + '/' + fixtureLoader.GITTER_INTEGRATION_REPO.toLowerCase() },
            { lcUri: fixtureLoader.GITTER_INTEGRATION_COMMUNITY.toLowerCase() + '/' + fixtureLoader.GITTER_INTEGRATION_ROOM.toLowerCase() },
            { lcUri: fixtureLoader.GITTER_INTEGRATION_USERNAME.toLowerCase() + '/' + fixtureLoader.GITTER_INTEGRATION_ROOM.toLowerCase() },
            { lcUri: fixtureLoader.GITTER_INTEGRATION_ORG.toLowerCase() + '/' + fixtureLoader.GITTER_INTEGRATION_ROOM.toLowerCase() },

          ]
        },
        user1: {
          githubToken: fixtureLoader.GITTER_INTEGRATION_USER_SCOPE_TOKEN,
          username: fixtureLoader.GITTER_INTEGRATION_USERNAME,
          accessToken: 'web-internal'
        },
        // group1 is a github user backed group
        group1: {
          uri: fixtureLoader.GITTER_INTEGRATION_USERNAME,
          lcUri: fixtureLoader.GITTER_INTEGRATION_USERNAME.toLowerCase(),
          securityDescriptor: {
            type: 'GH_USER',
            linkPath: fixtureLoader.GITTER_INTEGRATION_USERNAME,
            extraAdmins: ['user1']
          }
        },
        // group2 is a "normal" group
        group2: {
          securityDescriptor: {
            extraAdmins: ['user1']
          }
        },
        // group3 is a github org backed group
        group3: {
          uri: fixtureLoader.GITTER_INTEGRATION_ORG,
          lcUri: fixtureLoader.GITTER_INTEGRATION_ORG.toLowerCase(),
          securityDescriptor: {
            type: 'GH_ORG',
            linkPath: fixtureLoader.GITTER_INTEGRATION_ORG,
            extraAdmins: ['user1']
          }
        }
      })()
    .then(function() {
      group1WithPolicyService = new GroupWithPolicyService(fixture.group1, fixture.user1, isAdminPolicy);
      group2WithPolicyService = new GroupWithPolicyService(fixture.group2, fixture.user1, isAdminPolicy);
      group3WithPolicyService = new GroupWithPolicyService(fixture.group3, fixture.user1, isAdminPolicy);
    });
  });

  afterEach(function() {
    fixture.cleanup();
  });

  // repo rooms

  it('should create a repo room (inherited)', function() {
    return group1WithPolicyService.createRoom({
        type: 'GH_REPO',
        name: fixtureLoader.GITTER_INTEGRATION_REPO,
        security: 'PUBLIC',
        linkPath: linkPath
      })
      .then(function(room) {
        return securityDescriptorService.getForRoomUser(room._id, null);
      })
      .then(function(securityDescriptor) {
        assert.deepEqual(securityDescriptor, {
          type: 'GH_REPO',
          members: 'PUBLIC',
          admins: 'GH_REPO_PUSH',
          public: true,
          linkPath: linkPath,
          externalId: fixtureLoader.GITTER_INTEGRATION_REPO_ID
        });
      });
  });

  it('should create a repo room (public)', function() {
    return group1WithPolicyService.createRoom({
        type: 'GH_REPO',
        name: fixtureLoader.GITTER_INTEGRATION_REPO,
        security: 'PUBLIC',
        linkPath: linkPath
      })
      .then(function(room) {
        return securityDescriptorService.getForRoomUser(room._id, null);
      })
      .then(function(securityDescriptor) {
        assert.deepEqual(securityDescriptor, {
          type: 'GH_REPO',
          members: 'PUBLIC',
          admins: 'GH_REPO_PUSH',
          public: true,
          linkPath: linkPath,
          externalId: fixtureLoader.GITTER_INTEGRATION_REPO_ID
        });
      });

  });

  it('should create a repo room (private)', function() {
    return group1WithPolicyService.createRoom({
        type: 'GH_REPO',
        name: fixtureLoader.GITTER_INTEGRATION_REPO,
        security: 'PRIVATE',
        linkPath: linkPath
      })
      .then(function(room) {
        return securityDescriptorService.getForRoomUser(room._id, null);
      })
      .then(function(securityDescriptor) {
        assert.deepEqual(securityDescriptor, {
          type: 'GH_REPO',
          members: 'GH_REPO_ACCESS',
          admins: 'GH_REPO_PUSH',
          public: false,
          linkPath: linkPath,
          externalId: fixtureLoader.GITTER_INTEGRATION_REPO_ID
        });
      });
  });

  it('should throw an error if you try and add a GitHub repo backed room to a non-Github group', function() {
    return group2WithPolicyService.createRoom({
        type: 'GH_REPO',
        name: fixtureLoader.GITTER_INTEGRATION_REPO,
        security: 'PUBLIC',
        linkPath: linkPath
      })
      .then(function() {
        assert.ok(false, "error expected");
      })
      .catch(StatusError, function(err) {
        assert.strictEqual(err.status, 400);
      });
  });

  // normal rooms

  it('should create a normal room (public)', function() {
    var topic = 'litter us with puns';
    return group2WithPolicyService.createRoom({
        type: null,
        name: fixtureLoader.GITTER_INTEGRATION_ROOM,
        topic: topic,
        security: 'PUBLIC'
      })
      .then(function(room) {
        assert.strictEqual(room.uri, fixture.group2.uri+'/'+fixtureLoader.GITTER_INTEGRATION_ROOM);
        assert.strictEqual(room.lcUri, fixture.group2.lcUri+'/'+fixtureLoader.GITTER_INTEGRATION_ROOM.toLowerCase());
        assert.equal(room.topic, topic);
        assert.equal(room.groupId, fixture.group2.id);

        return securityDescriptorService.getForRoomUser(room._id, null);
      })
      .then(function(securityDescriptor) {
        assert.deepEqual(securityDescriptor, {
          type: null,
          public: true,
          admins: 'MANUAL',
          members: 'PUBLIC'
        });
      });
  });

  it('should create a normal room (private)', function() {
    var topic = 'should we change the topic?';
    return group2WithPolicyService.createRoom({
        type: null,
        name: fixtureLoader.GITTER_INTEGRATION_ROOM,
        topic: topic,
        security: 'PRIVATE'
      })
      .then(function(room) {
        return securityDescriptorService.getForRoomUser(room._id, null);
      })
      .then(function(securityDescriptor) {
        assert.deepEqual(securityDescriptor, {
          type: null,
          public: false,
          admins: 'MANUAL',
          members: 'INVITE'
        });
      });
  });

  it('should throw an error when validateRoomName fails', function() {
    return group2WithPolicyService.createRoom({
        type: null,
        name: '',
        security: 'PUBLIC'
      })
      .then(function() {
        assert.ok(false, 'expected error')
      })
      .catch(StatusError, function(error) {
        assert.strictEqual(error.status, 400);
      });
  });

  it('should throw an error when the room uri is already taken', function() {
    var roomOpts = {
      type: null,
      name: fixtureLoader.GITTER_INTEGRATION_ROOM,
      security: 'PUBLIC'
    };
    // create once
    return group2WithPolicyService.createRoom(roomOpts)
      .then(function() {
        // create twice
        return group2WithPolicyService.createRoom(roomOpts)
      })
      .then(function() {
        assert.ok(false, "error expected");
      })
      .catch(StatusError, function(err) {
        assert.deepEqual(err.status, 409);
      });
  });

  // org rooms

  it('should create an org room (public)', function() {
    return group3WithPolicyService.createRoom({
        type: 'GH_ORG',
        name: fixtureLoader.GITTER_INTEGRATION_ROOM,
        security: 'PUBLIC',
        linkPath: fixtureLoader.GITTER_INTEGRATION_ORG
      })
      .then(function(room) {
        return securityDescriptorService.getForRoomUser(room._id, null);
      })
      .then(function(securityDescriptor) {
        assert.deepEqual(securityDescriptor, {
          type: 'GH_ORG',
          members: 'PUBLIC',
          admins: 'GH_ORG_MEMBER',
          public: true,
          linkPath: fixtureLoader.GITTER_INTEGRATION_ORG,
          externalId: fixtureLoader.GITTER_INTEGRATION_ORG_ID
        });
      });
  });

  it('should create an org room (private)', function() {
    return group3WithPolicyService.createRoom({
        type: 'GH_ORG',
        name: fixtureLoader.GITTER_INTEGRATION_ROOM,
        security: 'PRIVATE',
        linkPath: fixtureLoader.GITTER_INTEGRATION_ORG
      })
      .then(function(room) {
        return securityDescriptorService.getForRoomUser(room._id, null);
      })
      .then(function(securityDescriptor) {
        assert.deepEqual(securityDescriptor, {
          type: 'GH_ORG',
          members: 'GH_ORG_MEMBER',
          admins: 'GH_ORG_MEMBER',
          public: false,
          linkPath: fixtureLoader.GITTER_INTEGRATION_ORG,
          externalId: fixtureLoader.GITTER_INTEGRATION_ORG_ID
        });
      });
  });

  // user rooms

  it('should create a user room (public)', function() {
    return group1WithPolicyService.createRoom({
        type: 'GH_USER',
        name: fixtureLoader.GITTER_INTEGRATION_ROOM,
        security: 'PUBLIC',
        linkPath: fixtureLoader.GITTER_INTEGRATION_USERNAME
      })
      .then(function(room) {
        return securityDescriptorService.getForRoomUser(room._id, null);
      })
      .then(function(securityDescriptor) {
        assert.deepEqual(securityDescriptor, {
          type: 'GH_USER',
          members: 'PUBLIC',
          admins: 'GH_USER_SAME',
          public: true,
          linkPath: fixtureLoader.GITTER_INTEGRATION_USERNAME,
          externalId: fixtureLoader.GITTER_INTEGRATION_USER_ID
        });
      });
  });

  it('should create a user room (private)', function() {
    return group1WithPolicyService.createRoom({
        type: 'GH_USER',
        name: fixtureLoader.GITTER_INTEGRATION_ROOM,
        security: 'PRIVATE',
        linkPath: fixtureLoader.GITTER_INTEGRATION_USERNAME
      })
      .then(function(room) {
        return securityDescriptorService.getForRoomUser(room._id, null);
      })
      .then(function(securityDescriptor) {
        assert.deepEqual(securityDescriptor, {
          type: 'GH_USER',
          members: 'INVITE',
          admins: 'GH_USER_SAME',
          public: false,
          linkPath: fixtureLoader.GITTER_INTEGRATION_USERNAME,
          externalId: fixtureLoader.GITTER_INTEGRATION_USER_ID
        });
      });
  });

  // TODO: test all the obtainAccessFromGitHubRepo cases

});
