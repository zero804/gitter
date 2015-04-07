/*jshint globalstrict:true, trailing:false, unused:true, node:true */
/*global describe:true, it:true, before:true, after:true */
"use strict";

var testRequire        = require('./../test-require');
var fixtureLoader      = require('../test-fixtures');
var userTroupeSettingsService = testRequire('./services/user-troupe-settings-service');
var assert             = testRequire("assert");

var fixture = {};

describe("User Troupe Settings Service", function() {

  before(fixtureLoader(fixture, {
    user1: { },
    user2: { },
    user3: { },
    troupe1: { users: ['user1', 'user2', 'user3'] }
  }));

  after(function() {
    fixture.cleanup();
  });

  it('should be able to set troupe settings', function(done) {
    var userId = fixture.user1.id;
    var troupeId = fixture.troupe1.id;

    return userTroupeSettingsService.setUserSettings(userId, troupeId, 'test', { value1: 1, value2: true, value3: 'string' })
      .then(function() {
        return userTroupeSettingsService.getUserSettings(userId, troupeId, 'test');
      })
      .then(function(settings) {
        assert.equal(settings.value1, 1);
        assert.equal(settings.value2, true);
        assert.equal(settings.value3, 'string');
      })
    .nodeify(done);
  });

  it('should be able to set multiple keys', function(done) {
    var userId = fixture.user1.id;
    var troupeId = fixture.troupe1.id;

    return userTroupeSettingsService.setUserSettings(userId, troupeId, 'test', { value1: 1, value2: true, value3: 'string' })
      .then(function() {
        return userTroupeSettingsService.setUserSettings(userId, troupeId, 'test2', { human: 1, monkey: 0 });
      })
      .then(function() {
        return userTroupeSettingsService.getUserSettings(userId, troupeId, 'test');
      })
      .then(function(settings) {
        assert.equal(settings.value1, 1);
        assert.equal(settings.value2, true);
        assert.equal(settings.value3, 'string');
      })
      .then(function() {
        return userTroupeSettingsService.getUserSettings(userId, troupeId, 'test2');
      })
      .then(function(settings) {
        assert.equal(settings.human, 1);
        assert.equal(settings.monkey, 0);
      })
      .then(function() {
        return userTroupeSettingsService.getAllUserSettings(userId, troupeId);
      })
      .then(function(settings) {
        assert(settings.test);
        assert(settings.test.value1);
        assert(settings.test2);
        assert(settings.test2.human);
      })
      .nodeify(done);
  });

  it('should be able to fetch keys for multiple usertroupes', function(done) {
    var user1Id = fixture.user1.id;
    var user2Id = fixture.user2.id;
    var troupeId = fixture.troupe1.id;

    return userTroupeSettingsService.setUserSettings(user1Id, troupeId, 'test3', { bob: 1 })
      .then(function() {
        return userTroupeSettingsService.setUserSettings(user2Id, troupeId, 'test3', { bob: 2 });
      })
      .then(function() {
        return userTroupeSettingsService.getMultiUserTroupeSettings([ { userId: user1Id, troupeId: troupeId }, { userId: user2Id, troupeId: troupeId } ], 'test3');
      })
      .then(function(results) {
        assert.equal(Object.keys(results).length, 2);
        assert.equal(results[user1Id + ':' + troupeId].bob, 1);
        assert.equal(results[user2Id + ':' + troupeId].bob, 2);
      })
      .nodeify(done);
  });

  it('should be able to update settings for multiple users in a troupe', function(done) {
    var user1Id = fixture.user1.id;
    var user2Id = fixture.user2.id;
    var user3Id = fixture.user3.id;
    var troupeId = fixture.troupe1.id;

    return userTroupeSettingsService.setUserSettings(user1Id, troupeId, 'test4', { bob: 1 })
      .then(function() {
        return userTroupeSettingsService.setUserSettings(user2Id, troupeId, 'test4B', { mary: 1 })
      })
      .then(function() {
        return userTroupeSettingsService.setUserSettingsForUsersInTroupe(troupeId, [user1Id, user2Id, user3Id], 'test4', { bob: 2 });
      })
      .then(function() {
        return userTroupeSettingsService.getMultiUserTroupeSettings([
          { userId: user1Id, troupeId: troupeId },
          { userId: user2Id, troupeId: troupeId },
          { userId: user3Id, troupeId: troupeId },
        ], 'test4');
      })
      .then(function(results) {
        assert.equal(Object.keys(results).length, 3);
        assert.equal(results[user1Id + ':' + troupeId].bob, 2);
        assert.equal(results[user2Id + ':' + troupeId].bob, 2);
        assert.equal(results[user3Id + ':' + troupeId].bob, 2);

        return userTroupeSettingsService.getUserSettings(user2Id, troupeId, 'test4B');
      })
      .then(function(value) {
        assert.deepEqual(value, { mary: 1 });
      })
      .nodeify(done);
  });

});
