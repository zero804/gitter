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
    user1: { username: true },
    troupe1: { users: ['user1'] }
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
    .nodeify(done);
  });

});