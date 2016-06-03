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
  var groupWithPolicyService;

  var linkPath = fixtureLoader.GITTER_INTEGRATION_USERNAME + '/' + fixtureLoader.GITTER_INTEGRATION_REPO;

  beforeEach(function() {
    return fixtureLoader(fixture, {
        deleteDocuments: {
          User: [{ username: fixtureLoader.GITTER_INTEGRATION_USERNAME }],
          Group: [{ lcUri: fixtureLoader.GITTER_INTEGRATION_ORG.toLowerCase() },
                  { lcUri: fixtureLoader.GITTER_INTEGRATION_COMMUNITY.toLowerCase() } ],
          Troupe: [ { lcUri: fixtureLoader.GITTER_INTEGRATION_USERNAME.toLowerCase() + '/' + fixtureLoader.GITTER_INTEGRATION_REPO.toLowerCase() },
                    { lcUri: fixtureLoader.GITTER_INTEGRATION_COMMUNITY.toLowerCase() + '/' + fixtureLoader.GITTER_INTEGRATION_ROOM.toLowerCase() }]
        },
        user1: {
          githubToken: fixtureLoader.GITTER_INTEGRATION_USER_SCOPE_TOKEN,
          username: fixtureLoader.GITTER_INTEGRATION_USERNAME,
          accessToken: 'web-internal'
        },
        group1: {
          securityDescriptor: {
            extraAdmins: ['user1']
          }
        }
      })()
    .then(function() {
      groupWithPolicyService = new GroupWithPolicyService(fixture.group1, fixture.user1, isAdminPolicy);
    });
  });

  afterEach(function() {
    fixture.cleanup();
  });

  it('should create a normal room (public)', function() {
    var topic = 'litter us with puns';
    return groupWithPolicyService.createRoom({
        type: null,
        name: fixtureLoader.GITTER_INTEGRATION_ROOM,
        topic: topic,
        security: 'PUBLIC'
      })
      .then(function(room) {
        assert.strictEqual(room.uri, fixture.group1.uri+'/'+fixtureLoader.GITTER_INTEGRATION_ROOM);
        assert.strictEqual(room.lcUri, fixture.group1.lcUri+'/'+fixtureLoader.GITTER_INTEGRATION_ROOM.toLowerCase());
        assert.equal(room.topic, topic);
        assert.equal(room.groupId, fixture.group1.id);

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
    return groupWithPolicyService.createRoom({
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

  it('should throw an error when trying to create a normal room with security: INHERIT', function() {
    return groupWithPolicyService.createRoom({
        type: null,
        name: fixtureLoader.GITTER_INTEGRATION_ROOM,
        security: 'INHERITED'
      })
      .then(function() {
        assert.ok(false, 'expected error')
      })
      .catch(StatusError, function(error) {
        assert.strictEqual(error.status, 400);
      });
  });

  it('should create a repo room (inherit)', function() {
    return groupWithPolicyService.createRoom({
        type: 'GH_REPO',
        name: fixtureLoader.GITTER_INTEGRATION_REPO,
        security: 'INHERITED',
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

  it('should create a repo room (public)', function() {
    return groupWithPolicyService.createRoom({
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
    return groupWithPolicyService.createRoom({
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

  // TODO: what about an org channel?
  // TODO: what about if someone tries to pass in a gh user as linkPath?
});
