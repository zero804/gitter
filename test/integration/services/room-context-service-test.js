"use strict";

var testRequire = require('../test-require');
var assert = require('assert');
var mockito = require('jsmockito').JsMockito;
var Promise = require('bluebird');

var permissionsModelMock = mockito.mockFunction();
var roomPermissionsModelMock = mockito.mockFunction();

mockito.when(permissionsModelMock)().thenReturn(Promise.resolve(true));
mockito.when(roomPermissionsModelMock)().thenReturn(Promise.resolve(true));

var roomContextService = testRequire.withProxies("./services/room-context-service", {
  'gitter-web-permissions/lib/permissions-model': permissionsModelMock,
  'gitter-web-permissions/lib/room-permissions-model': roomPermissionsModelMock
});

var fixtureLoader = require('../test-fixtures');
var fixture = {};

describe('room-context-service', function() {

  before(fixtureLoader(fixture, {
    user1: {},
    user2: {},
    troupe1: {
      users: ['user1', 'user2']
    },
    troupe2: {}
  }));

  it('should generate context for non-members', function(done) {
    return roomContextService.findContextForUri(fixture.user1, fixture.troupe2.uri, {})
    .then(function(roomContext) {
      assert(!roomContext.roomMember);
    })
    .nodeify(done);
  });

  it('should generate context for members', function(done) {
    return roomContextService.findContextForUri(fixture.user1, fixture.troupe1.uri, {})
    .then(function(roomContext) {
      assert(roomContext.roomMember);
    })
    .nodeify(done);
  });

  it('should throw for users without access to the room', function(done) {
    mockito.when(roomPermissionsModelMock)().thenReturn(Promise.resolve(false));

    return roomContextService.findContextForUri(fixture.user1, fixture.troupe2.uri, {})
    .then(function(/*roomContext*/) {
    })
    .catch(function(err) {
      assert(err.status === 404);
    })
    .nodeify(done);
  });

  it('should generate context for 1:1', function(done) {
    mockito.when(roomPermissionsModelMock)().thenReturn(Promise.resolve(false));

    return roomContextService.findContextForUri(fixture.user1, fixture.user2.username, {})
    .then(function(roomContext) {
      assert(roomContext.roomMember);
    })
    .nodeify(done);
  });

  it('should throw a redirect for 1:1 same user', function(done) {
    return roomContextService.findContextForUri(fixture.user1, fixture.user1.username, {})
    .then(function(/*roomContext*/) {
    })
    .catch(function(err) {
      assert(err.status === 301);
      assert(err.path === '/home/explore');
    })
    .nodeify(done);
  });

  it('should be logged in to see a 1:1', function(done) {
    return roomContextService.findContextForUri(null, fixture.user1.username, {})
    .then(function(/*roomContext*/) {
    })
    .catch(function(err) {
      assert(err.status === 401);
    })
    .nodeify(done);
  });

  after(function() {
    fixture.cleanup();
  });

});
