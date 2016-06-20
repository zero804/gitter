"use strict";

var testRequire = require('./../test-require');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var userSettingsService = testRequire('./services/user-settings-service');
var assert = testRequire("assert");
var ObjectID = require('mongodb').ObjectID;
var fixture = {};

describe("User Settings Service", function() {

  before(fixtureLoader(fixture, {
    user1: { },
    user2: { }
  }));

  after(function() {
    fixture.cleanup();
  });

  it('should be able to set user settings', function(done) {
    var userId = fixture.user1.id;

    return userSettingsService.setUserSettings(userId, 'test', { value1: 1, value2: true, value3: 'string' })
      .then(function() {
        return userSettingsService.getUserSettings(userId, 'test');
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

    return userSettingsService.setUserSettings(userId, 'test', { value1: 1, value2: true, value3: 'string' })
      .then(function() {
        return userSettingsService.setUserSettings(userId, 'test2', { human: 1, monkey: 0 });
      })
      .then(function() {
        return userSettingsService.getUserSettings(userId, 'test');
      })
      .then(function(settings) {
        assert.equal(settings.value1, 1);
        assert.equal(settings.value2, true);
        assert.equal(settings.value3, 'string');
      })
      .then(function() {
        return userSettingsService.getUserSettings(userId, 'test2');
      })
      .then(function(settings) {
        assert.equal(settings.human, 1);
        assert.equal(settings.monkey, 0);
      })
      .then(function() {
        return userSettingsService.getAllUserSettings(userId);
      })
      .then(function(settings) {
        assert(settings.test);
        assert(settings.test.value1);
        assert(settings.test2);
        assert(settings.test2.human);
      })
      .nodeify(done);
  });

  it('should be able to get multiple keys', function() {
    var userId = fixture.user1.id;
    var V1 = { value1: 1, value2: true, value3: 'string' };
    var V2 = { human: 1, monkey: 0 };

    return userSettingsService.setUserSettings(userId, 'test', V1)
      .then(function() {
        return userSettingsService.setUserSettings(userId, 'test2', V2);
      })
      .then(function() {
        return userSettingsService.getMultiUserSettingsForUserId(userId, ['test', 'test2', 'notset']);
      })
      .then(function(settings) {
        assert.deepEqual(settings, {
          test: V1,
          test2: V2
        });
      });
  });

  it('should be able to get multiple keys when the user has no settings', function() {
    return userSettingsService.getMultiUserSettingsForUserId(new ObjectID(), ['test', 'test2', 'notset'])
      .then(function(settings) {
        assert.deepEqual(settings, {
        });
      });
  });

  it('should be able to fetch keys for multiple usertroupes', function(done) {
    var user1Id = fixture.user1.id;
    var user2Id = fixture.user2.id;

    return userSettingsService.setUserSettings(user1Id, 'test3', { bob: 1 })
      .then(function() {
        return userSettingsService.setUserSettings(user2Id, 'test3', { bob: 2 });
      })
      .then(function() {
        return userSettingsService.getMultiUserSettings([user1Id, user2Id], 'test3');
      })
      .then(function(results) {
        assert.equal(Object.keys(results).length, 2);
        assert.equal(results[user1Id].bob, 1);
        assert.equal(results[user2Id].bob, 2);
      })
      .nodeify(done);
  });


});
