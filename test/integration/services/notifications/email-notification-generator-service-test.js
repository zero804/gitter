/* jshint node:true */
/*global describe:true, it:true, beforeEach:true, afterEach:true */

"use strict";

var testRequire = require('../../test-require');
var assert      = require("assert");
var mockito     = require('jsmockito').JsMockito;
var Promise     = require('bluebird');

var userSettingsService = testRequire('./services/user-settings-service');
var fixtureLoader       = require('../../test-fixtures');
var underlyingUnreadItemService = testRequire('./services/unread-item-service');
var mongoUtils = testRequire('./utils/mongo-utils');
var userRoomNotificationService = testRequire("./services/user-room-notification-service");

var unreadItemServiceMock = mockito.spy(underlyingUnreadItemService);

describe('email-notification-generator-service', function() {
  this.timeout(5000);
  var fixture = {};

  beforeEach(fixtureLoader(fixture, {
    user1: { },
    user2: { },
    user3: { },
    troupe1: { users: ['user1', 'user2', 'user3']}
  }));
  afterEach(function() { fixture.cleanup(); });

  it('should send out an email notification for a user with unread items #slow', function(done) {
    var emailNotificationServiceMock = mockito.spy(testRequire('./services/email-notification-service'));
    var unreadEngine = testRequire('./services/unread-item-service-engine');

    var sendEmailNotifications = testRequire.withProxies('./services/notifications/email-notification-generator-service', {
      '../email-notification-service': emailNotificationServiceMock,
      '../unread-item-service': unreadItemServiceMock
    });

    var itemId1 = mongoUtils.getNewObjectIdString();
    var troupeId = fixture.troupe1.id;

    var u = 0, v = 0;
    mockito.when(emailNotificationServiceMock).sendUnreadItemsNotification().then(function(user, troupeWithCounts) {
      if(user.id == fixture.user2.id) {
        u++;
        assert.equal(u, 1);
        assert.equal(troupeWithCounts.length, 1);
        assert.equal(troupeWithCounts[0].troupe.id, troupeId);
      }

      if(user.id == fixture.user3.id) {
        v++;
        assert.equal(v, 1);
        assert.equal(troupeWithCounts.length, 1);
        assert.equal(troupeWithCounts[0].troupe.id, troupeId);
      }

      return Promise.resolve();
    });

    Promise.all([
      userSettingsService.setUserSettings(fixture.user2.id, 'unread_notifications_optout', false),
      ])
      .then(function() {
        return unreadEngine.newItemWithMentions(troupeId, itemId1, [fixture.user2.id, fixture.user3.id], []);
      })
      .then(function() {
        return sendEmailNotifications(Date.now());
      })
      .then(function() {
        assert.equal(u, 1);
        assert.equal(v, 1);
      })
      .nodeify(done);

  });

  it('SHOULD NOT email somebody who has opted out of notifications 1 #slow', function(done) {
    var emailNotificationServiceMock = mockito.spy(testRequire('./services/email-notification-service'));
    var unreadEngine = testRequire('./services/unread-item-service-engine');

    var sendEmailNotifications = testRequire.withProxies('./services/notifications/email-notification-generator-service', {
      '../email-notification-service': emailNotificationServiceMock,
      '../unread-item-service': unreadItemServiceMock
    });

    var itemId1 = mongoUtils.getNewObjectIdString();
    var troupeId = fixture.troupe1.id;

    var v = 0;
    mockito.when(emailNotificationServiceMock).sendUnreadItemsNotification().then(function(user, troupeWithCounts) {
      assert(user.id !== fixture.user2.id);

      if(user.id == fixture.user3.id) {
        v++;
        assert.equal(v, 1);
        assert.equal(troupeWithCounts.length, 1);
        assert.equal(troupeWithCounts[0].troupe.id, fixture.troupe1.id);
      }

      return Promise.resolve();
    });

    Promise.all([
      userSettingsService.setUserSettings(fixture.user2.id, 'unread_notifications_optout', true),
      ])
      .then(function() {
        return unreadEngine.newItemWithMentions(troupeId, itemId1, [fixture.user2.id, fixture.user3.id], []);
      })
      .then(function() {
        return sendEmailNotifications(Date.now() + 10);
      })
      .then(function() {
        assert.equal(v, 1);
      })
      .nodeify(done);

  });


  it('SHOULD NOT email somebody who has opted out of notifications 2 #slow', function(done) {
    var emailNotificationServiceMock = mockito.spy(testRequire('./services/email-notification-service'));
    var unreadEngine = testRequire('./services/unread-item-service-engine');

    var sendEmailNotifications = testRequire.withProxies('./services/notifications/email-notification-generator-service', {
      '../email-notification-service': emailNotificationServiceMock,
      '../unread-item-service': unreadItemServiceMock
    });


    var itemId1 = mongoUtils.getNewObjectIdString();
    var itemId2 = mongoUtils.getNewObjectIdString();

    var troupeId = fixture.troupe1.id;

    var v = 0;
    mockito.when(emailNotificationServiceMock).sendUnreadItemsNotification().then(function(user, troupeWithCounts) {
      assert(user.id !== fixture.user2.id);

      if(user.id == fixture.user3.id) {
        v++;
        assert.equal(v, 1);
        assert.equal(troupeWithCounts.length, 1);
        assert.equal(troupeWithCounts[0].troupe.id, fixture.troupe1.id);
      }

      return Promise.resolve();
    });


    return Promise.all([
        userSettingsService.setUserSettings(fixture.user2.id, 'unread_notifications_optout', true),
        userRoomNotificationService.updateSettingForUserRoom(fixture.user2.id, troupeId, 'all')
      ])
      .then(function() {
        return unreadEngine.newItemWithMentions(troupeId, itemId1, [fixture.user2.id, fixture.user3.id], []);
      })
      .then(function() {
        return Promise.all([
          underlyingUnreadItemService.markAllChatsRead(fixture.user1.id, fixture.troupe1.id),
          underlyingUnreadItemService.markAllChatsRead(fixture.user3.id, fixture.troupe1.id)
        ]);
      })
      .then(function() {
        return unreadEngine.newItemWithMentions(troupeId, itemId2, [fixture.user2.id, fixture.user3.id], []);
      })
      .then(function() {
        return sendEmailNotifications(Date.now(), 1000)
          .then(function() {
            assert.equal(v, 1);
          });
      })
      .nodeify(done);

  });


it('SHOULD NOT email somebody who has opted out of notifications set to mention only #slow', function(done) {
  var emailNotificationServiceMock = mockito.spy(testRequire('./services/email-notification-service'));
  var unreadEngine = testRequire('./services/unread-item-service-engine');

  var sendEmailNotifications = testRequire.withProxies('./services/notifications/email-notification-generator-service', {
    '../email-notification-service': emailNotificationServiceMock,
    '../unread-item-service': unreadItemServiceMock
  });

  var v = 0;
  var itemId1 = mongoUtils.getNewObjectIdString();
  var troupeId = fixture.troupe1.id;

  mockito.when(emailNotificationServiceMock).sendUnreadItemsNotification().then(function(user, troupeWithCounts) {
    assert.notEqual(user.id, fixture.user2.id);

    if(user.id == fixture.user3.id) {
      v++;
      assert.equal(v, 1);
      assert.equal(troupeWithCounts.length, 1);
      assert.equal(troupeWithCounts[0].troupe.id, fixture.troupe1.id);
    }

    return Promise.resolve();
  });

  return Promise.all([
      underlyingUnreadItemService.markAllChatsRead(fixture.user2.id, fixture.troupe1.id),
      userSettingsService.setUserSettings(fixture.user2.id, 'unread_notifications_optout', false),
      userRoomNotificationService.updateSettingForUserRoom(fixture.user2.id, fixture.troupe1.id, 'mention')
    ])
    .then(function() {
      return unreadEngine.newItemWithMentions(troupeId, itemId1, [fixture.user2.id, fixture.user3.id], []);
    })
    .then(function() {
      return sendEmailNotifications(Date.now());
    })
    .then(function() {
      assert.equal(v, 1);
    })
    .nodeify(done);

});

  // TODO: handle mentions
  it('SHOULD email somebody who has not opted out of notifications for a specific troupe #slow', function(done) {
    var emailNotificationServiceMock = mockito.spy(testRequire('./services/email-notification-service'));
    var unreadEngine = testRequire('./services/unread-item-service-engine');

    var sendEmailNotifications = testRequire.withProxies('./services/notifications/email-notification-generator-service', {
      '../email-notification-service': emailNotificationServiceMock,
      '../unread-item-service': unreadItemServiceMock
    });

    var itemId1 = mongoUtils.getNewObjectIdString();
    var troupeId = fixture.troupe1.id;

    var u = 0, v = 0;
    mockito.when(emailNotificationServiceMock).sendUnreadItemsNotification().then(function(user, troupeWithCounts) {
      if(user.id == fixture.user2.id) {
        u++;
        assert.equal(u, 1);
        assert.equal(troupeWithCounts.length, 1);
        assert.equal(troupeWithCounts[0].troupe.id, fixture.troupe1.id);
      }

      if(user.id == fixture.user3.id) {
        v++;
        assert.equal(v, 1);
        assert.equal(troupeWithCounts.length, 1);
        assert.equal(troupeWithCounts[0].troupe.id, fixture.troupe1.id);
      }
      return Promise.resolve();
    });

    Promise.all([
      userSettingsService.setUserSettings(fixture.user2.id, 'unread_notifications_optout', false),
      userRoomNotificationService.updateSettingForUserRoom(fixture.user2.id, fixture.troupe1.id, 'all'),
      unreadEngine.newItemWithMentions(troupeId, itemId1, [fixture.user2.id, fixture.user3.id], [])
      ])
      .then(function() {
        return sendEmailNotifications(Date.now());
      })
      .then(function() {
        assert.equal(u, 1);
        assert.equal(v, 1);
      })
      .nodeify(done);
  });


});
