"use strict";

var testRequire = require('../test-require');
var assert = require('assert');
var mockito = require('jsmockito').JsMockito;
var Promise = require('bluebird');

var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var fixture = {};

describe('room-context-service', function() {
  var createPolicyForRoom, roomContextService, access;

  before(fixtureLoader(fixture, {
    user1: {},
    user2: {},
    troupe1: {
      users: ['user1', 'user2']
    },
    troupe2: {}
  }));

  beforeEach(function() {
    createPolicyForRoom = mockito.mockFunction();
    access = false;

    mockito.when(createPolicyForRoom)().then(function() {
      return Promise.resolve({
        canRead: function() {
          return Promise.resolve(access);
        }
      });
    });

    roomContextService = testRequire.withProxies("./services/room-context-service", {
      'gitter-web-permissions/lib/legacy-policy-factory': {
        createPolicyForRoom: createPolicyForRoom
      }
    });

  })

  it('should generate context for non-members', function(done) {
    access = true;
    return roomContextService.findContextForUri(fixture.user1, fixture.troupe2.uri, {})
    .then(function(roomContext) {
      assert(!roomContext.roomMember);
    })
    .nodeify(done);
  });

  it('should generate context for members', function(done) {
    access = true;
    return roomContextService.findContextForUri(fixture.user1, fixture.troupe1.uri, {})
    .then(function(roomContext) {
      assert(roomContext.roomMember);
    })
    .nodeify(done);
  });

  it('should throw for users without access to the room', function(done) {
    access = false;

    return roomContextService.findContextForUri(fixture.user1, fixture.troupe2.uri, {})
    .then(function(/*roomContext*/) {
    })
    .catch(function(err) {
      assert(err.status === 404);
    })
    .nodeify(done);
  });

  it('should generate context for 1:1', function() {
    access = true;

    return roomContextService.findContextForUri(fixture.user1, fixture.user2.username, {})
    .then(function(roomContext) {
      assert(roomContext.roomMember);
    });
  });

  it('should throw a redirect for 1:1 same user', function() {
    return roomContextService.findContextForUri(fixture.user1, fixture.user1.username, {})
    .then(function(/*roomContext*/) {
      assert.ok(false);
    }, function(err) {
      assert(err.status === 301);
      assert(err.path === '/home/explore');
    })
  });

  it('should be logged in to see a 1:1', function() {
    return roomContextService.findContextForUri(null, fixture.user1.username, {})
    .then(function(/*roomContext*/) {
      assert.ok(false);
    }, function(err) {
      assert(err.status === 401);
    });
  });

  after(function() {
    fixture.cleanup();
  });

});
