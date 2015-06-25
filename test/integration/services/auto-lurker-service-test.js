/*jslint node:true, unused:true*/
/*global describe:true, it:true, before:true, after: true */
"use strict";

var testRequire = require('../test-require');
var assert = require('assert');
var fixtureLoader = require('../test-fixtures');

var autoLurkerService = testRequire("./services/auto-lurker-service");
var recentRoomService = testRequire("./services/recent-room-service");
var roomService = testRequire("./services/room-service");
var persistence = testRequire("./services/persistence-service");
var userTroupeSettingsService = testRequire("./services/user-troupe-settings-service");

describe('auto-lurker-service', function() {

  describe('#findLurkCandidates', function() {
    var fixture = {};

    before(fixtureLoader(fixture, {
      user1: { },
      user2: { },
      troupe1: { users: ['user1'] }
    }));

    after(function() {
      fixture.cleanup();
    });

    it('#01 should return a lurk candidate',function(done) {
      var tenDaysAgo = new Date(Date.now() - 86400000 * 10);
      return recentRoomService.saveLastVisitedTroupeforUserId(fixture.user1.id, fixture.troupe1.id, { lastAccessTime: tenDaysAgo })
        .then(function() {
          return autoLurkerService.findLurkCandidates(fixture.troupe1, { minTimeInDays: 1 });
        })
        .then(function(candidates) {
          assert(candidates.length === 1);

          assert.equal(candidates[0].userId, fixture.user1.id);
          assert(!candidates[0].lurk);
          assert(!candidates[0].notificationSettings);
          assert.equal(candidates[0].lastAccessTime.valueOf(), tenDaysAgo.valueOf());
        })
        .nodeify(done);
    });

    it('#02 should return a lurk candidate with notify settings',function(done) {
      var tenDaysAgo = new Date(Date.now() - 86400000 * 10);
      return userTroupeSettingsService.setUserSettings(fixture.user1.id, fixture.troupe1.id, 'notifications', { push: 'mention' })
        .then(function() {
          return recentRoomService.saveLastVisitedTroupeforUserId(fixture.user1.id, fixture.troupe1.id, { lastAccessTime: tenDaysAgo });
        })
        .then(function() {
          return autoLurkerService.findLurkCandidates(fixture.troupe1, { minTimeInDays: 1 });
        })
        .then(function(candidates) {
          assert(candidates.length === 1);

          assert.equal(candidates[0].userId, fixture.user1.id);
          assert(!candidates[0].lurk);
          assert.equal(candidates[0].notificationSettings, 'mention');
          assert.equal(candidates[0].lastAccessTime.valueOf(), tenDaysAgo.valueOf());
        })
        .nodeify(done);
    });

    it('#03 should return a lurk candidate with notify settings',function(done) {
      var tenDaysAgo = new Date(Date.now() - 86400000 * 10);
      return userTroupeSettingsService.setUserSettings(fixture.user1.id, fixture.troupe1.id, 'notifications', { })
        .then(function() {
          fixture.troupe1.users[0].lurk = true; // Workaround
          return roomService.updateTroupeLurkForUserId(fixture.user1.id, fixture.troupe1.id, true); // lurk!
        })
        .then(function() {
          return recentRoomService.saveLastVisitedTroupeforUserId(fixture.user1.id, fixture.troupe1.id, { lastAccessTime: tenDaysAgo });
        })
        .then(function() {
          return autoLurkerService.findLurkCandidates(fixture.troupe1, { minTimeInDays: 1 });
        })
        .then(function(candidates) {
          assert(candidates.length === 1);

          assert.equal(candidates[0].userId, fixture.user1.id);
          assert(candidates[0].lurk);
          assert(!candidates[0].notificationSettings);
          assert.equal(candidates[0].lastAccessTime.valueOf(), tenDaysAgo.valueOf());
        })
        .nodeify(done);
    });

    it('#04 should not return fully lurked candidates',function(done) {
      var tenDaysAgo = new Date(Date.now() - 86400000 * 10);
      return userTroupeSettingsService.setUserSettings(fixture.user1.id, fixture.troupe1.id, 'notifications', { push: 'mention' })
        .then(function() {
          fixture.troupe1.users[0].lurk = true; // Workaround
          return roomService.updateTroupeLurkForUserId(fixture.user1.id, fixture.troupe1.id, true); // lurk!
        })
        .then(function() {
          return recentRoomService.saveLastVisitedTroupeforUserId(fixture.user1.id, fixture.troupe1.id, { lastAccessTime: tenDaysAgo });
        })
        .then(function() {
          return autoLurkerService.findLurkCandidates(fixture.troupe1, { minTimeInDays: 1 });
        })
        .then(function(candidates) {
          assert(candidates.length === 0);
          })
        .nodeify(done);
    });

  });

  describe('#autoLurkInactiveUsers', function() {
    var fixture = {};

    before(fixtureLoader(fixture, {
      user1: { },
      user2: { },
      troupe1: { users: ['user1'] }
    }));

    after(function() {
      fixture.cleanup();
    });

    it('#01 should return a lurk candidate',function(done) {
      var tenDaysAgo = new Date(Date.now() - 86400000 * 10);
      return recentRoomService.saveLastVisitedTroupeforUserId(fixture.user1.id, fixture.troupe1.id, { lastAccessTime: tenDaysAgo })
        .then(function() {
          return autoLurkerService.autoLurkInactiveUsers(fixture.troupe1, { minTimeInDays: 1 });
        })
        .then(function() {
          return [
            userTroupeSettingsService.getUserSettings(fixture.user1.id, fixture.troupe1.id, 'notifications'),
            persistence.Troupe.findOneQ({ _id: fixture.troupe1._id }, { users: { $elemMatch: { userId: fixture.user1._id } } })
          ];
        })
        .spread(function(settings, t) {
          assert.strictEqual(settings.push, 'mention');
          assert(t.users[0].lurk);
        })
        .nodeify(done);
    });

    it('#02 should return a lurk candidate with notify settings',function(done) {
      var tenDaysAgo = new Date(Date.now() - 86400000 * 10);
      return userTroupeSettingsService.setUserSettings(fixture.user1.id, fixture.troupe1.id, 'notifications', { push: 'mention' })
        .then(function() {
          return recentRoomService.saveLastVisitedTroupeforUserId(fixture.user1.id, fixture.troupe1.id, { lastAccessTime: tenDaysAgo });
        })
        .then(function() {
          return autoLurkerService.autoLurkInactiveUsers(fixture.troupe1, { minTimeInDays: 1 });
        })
        .then(function() {
          return [
            userTroupeSettingsService.getUserSettings(fixture.user1.id, fixture.troupe1.id, 'notifications'),
            persistence.Troupe.findOneQ({ _id: fixture.troupe1._id }, { users: { $elemMatch: { userId: fixture.user1._id } } })
          ];
        })
        .spread(function(settings, t) {
          assert.strictEqual(settings.push, 'mention');
          assert(t.users[0].lurk);
        })
        .nodeify(done);
    });

    it('#03 should return a lurk candidate with notify settings',function(done) {
      var tenDaysAgo = new Date(Date.now() - 86400000 * 10);
      return userTroupeSettingsService.setUserSettings(fixture.user1.id, fixture.troupe1.id, 'notifications', { push: 'mute' })
        .then(function() {
          fixture.troupe1.users[0].lurk = true; // Workaround
          return roomService.updateTroupeLurkForUserId(fixture.user1.id, fixture.troupe1.id, true); // lurk!
        })
        .then(function() {
          return recentRoomService.saveLastVisitedTroupeforUserId(fixture.user1.id, fixture.troupe1.id, { lastAccessTime: tenDaysAgo });
        })
        .then(function() {
          return autoLurkerService.autoLurkInactiveUsers(fixture.troupe1, { minTimeInDays: 1 });
        })
        .then(function() {
          return [
            userTroupeSettingsService.getUserSettings(fixture.user1.id, fixture.troupe1.id, 'notifications'),
            persistence.Troupe.findOneQ({ _id: fixture.troupe1._id }, { users: { $elemMatch: { userId: fixture.user1._id } } })
          ];
        })
        .spread(function(settings, t) {
          assert.strictEqual(settings.push, 'mute');
          assert(t.users[0].lurk);
        })
        .nodeify(done);
    });


  });

});
