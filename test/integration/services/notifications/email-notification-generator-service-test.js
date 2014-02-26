/* jshint node:true */
/*global describe:true, it:true, before:true */

"use strict";

var testRequire         = require('../../test-require');
var assert              = require("assert");
var mockito             = require('jsmockito').JsMockito;
var Q                   = require('q');
var chatService         = testRequire('./services/chat-service');
var userSettingsService = testRequire('./services/user-settings-service');
var userTroupeSettingsService = testRequire('./services/user-troupe-settings-service');
var fixtureLoader       = require('../../test-fixtures');
var underlyingUnreadItemService = testRequire('./services/unread-item-service');

var times  = mockito.Verifiers.times;
var never  = mockito.Verifiers.never();
var once   = times(1);
var twice  = times(2);
var thrice = times(3);


var unreadItemServiceMock = mockito.spy(underlyingUnreadItemService);
unreadItemServiceMock.install();

mockito.when(unreadItemServiceMock).markUserAsEmailNotified().thenReturn(Q.resolve());

var fixture = {};

before(fixtureLoader(fixture, {
  user1: { },
  user2: { },
  user3: { },
  troupe1: { users: ['user1', 'user2', 'user3']}
}));

describe('email-notification-generator-service', function() {

  it('should send out an email notification for a user with unread items', function(done) {
    var emailNotificationServiceMock = mockito.spy(testRequire('./services/email-notification-service'));

    var sendEmailNotifications = testRequire.withProxies('./services/notifications/email-notification-generator-service', {
      '../email-notification-service': emailNotificationServiceMock,
      '../unread-item-service': unreadItemServiceMock
    });

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

      return Q.resolve();
    });

    Q.all([
      userSettingsService.setUserSettings(fixture.user2.id, 'unread_notifications_optout', false),
      ])
      .then(function() {
        return chatService.newChatMessageToTroupe(fixture.troupe1, fixture.user1, 'Hello');
      })
      .delay(50)
      .then(function() {
        return sendEmailNotifications(Date.now());
      })
      .then(function() {
        assert.equal(u, 1);
        assert.equal(v, 1);
      })
      .nodeify(done);

  });

  it('SHOULD NOT email somebody who has opted out of notifications', function(done) {
    var emailNotificationServiceMock = mockito.spy(testRequire('./services/email-notification-service'));

    var sendEmailNotifications = testRequire.withProxies('./services/notifications/email-notification-generator-service', {
      '../email-notification-service': emailNotificationServiceMock,
      '../unread-item-service': unreadItemServiceMock
    });

    var v = 0;
    mockito.when(emailNotificationServiceMock).sendUnreadItemsNotification().then(function(user, troupeWithCounts) {
      assert(user.id !== fixture.user2.id);

      if(user.id == fixture.user3.id) {
        v++;
        assert.equal(v, 1);
        assert.equal(troupeWithCounts.length, 1);
        assert.equal(troupeWithCounts[0].troupe.id, fixture.troupe1.id);
      }

      return Q.resolve();
    });

    Q.all([
      userSettingsService.setUserSettings(fixture.user2.id, 'unread_notifications_optout', true),
      ])
      .then(function() {
        return chatService.newChatMessageToTroupe(fixture.troupe1, fixture.user1, 'Hello');
      })
      .delay(50)
      .then(function() {
        return sendEmailNotifications(Date.now());
      })
      .then(function() {
        assert.equal(v, 1);
      })
      .nodeify(done);

  });


  it('SHOULD NOT email somebody who has opted out of notifications', function(done) {
    var emailNotificationServiceMock = mockito.spy(testRequire('./services/email-notification-service'));

    var sendEmailNotifications = testRequire.withProxies('./services/notifications/email-notification-generator-service', {
      '../email-notification-service': emailNotificationServiceMock,
      '../unread-item-service': unreadItemServiceMock
    });

    var v = 0;
    mockito.when(emailNotificationServiceMock).sendUnreadItemsNotification().then(function(user, troupeWithCounts) {
      assert(user.id !== fixture.user2.id);

      if(user.id == fixture.user3.id) {
        v++;
        assert.equal(v, 1);
        assert.equal(troupeWithCounts.length, 1);
        assert.equal(troupeWithCounts[0].troupe.id, fixture.troupe1.id);
      }

      return Q.resolve();
    });

    underlyingUnreadItemService.markUserAsEmailNotified(fixture.user2.id)
      .then(function() {
        return Q.all([
            userSettingsService.setUserSettings(fixture.user2.id, 'unread_notifications_optout', true),
            userTroupeSettingsService.setUserSettings(fixture.user2.id, fixture.troupe1.id, 'notification', { push:  "all" }), // <-- NB
          ])
          .then(function() {
            return chatService.newChatMessageToTroupe(fixture.troupe1, fixture.user1, 'Hello');
          })
          .delay(50)
          .then(function() {
            return sendEmailNotifications(Date.now());
          })
          .then(function() {
            assert.equal(v, 1);
          });

      })
      .nodeify(done);

  });


it('SHOULD NOT email somebody who has opted out of notifications set to mention only', function(done) {
  var emailNotificationServiceMock = mockito.spy(testRequire('./services/email-notification-service'));

  var sendEmailNotifications = testRequire.withProxies('./services/notifications/email-notification-generator-service', {
    '../email-notification-service': emailNotificationServiceMock,
    '../unread-item-service': unreadItemServiceMock
  });

  var v = 0;

  mockito.when(emailNotificationServiceMock).sendUnreadItemsNotification().then(function(user, troupeWithCounts) {
    assert(user.id !== fixture.user2.id);

    if(user.id == fixture.user3.id) {
      v++;
      assert.equal(v, 1);
      assert.equal(troupeWithCounts.length, 1);
      assert.equal(troupeWithCounts[0].troupe.id, fixture.troupe1.id);
    }

    return Q.resolve();
  });

  underlyingUnreadItemService.markUserAsEmailNotified(fixture.user2.id)
    .then(function() {
      return Q.all([
          underlyingUnreadItemService.markAllChatsRead(fixture.user2.id, fixture.troupe1.id),
          userSettingsService.setUserSettings(fixture.user2.id, 'unread_notifications_optout', false),
          userTroupeSettingsService.setUserSettings(fixture.user2.id, fixture.troupe1.id, 'notifications', { push: "mentions" } ), // <-- NB
        ])
        .then(function() {
          return chatService.newChatMessageToTroupe(fixture.troupe1, fixture.user1, 'Hello');
        })
        .delay(50)
        .then(function() {
          return sendEmailNotifications(Date.now());
        })
        .then(function() {
          assert.equal(v, 1);
        });


    })
    .nodeify(done);

});

  // TODO: handle mentions
  it('SHOULD email somebody who has not opted out of notifications for a specific troupe', function(done) {
    var emailNotificationServiceMock = mockito.spy(testRequire('./services/email-notification-service'));

    var sendEmailNotifications = testRequire.withProxies('./services/notifications/email-notification-generator-service', {
      '../email-notification-service': emailNotificationServiceMock,
      '../unread-item-service': unreadItemServiceMock
    });

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
      return Q.resolve();
    });

    Q.all([
      userSettingsService.setUserSettings(fixture.user2.id, 'unread_notifications_optout', false),
      userTroupeSettingsService.setUserSettings(fixture.user2.id, fixture.troupe1.id, 'notifications', { push: "all" } ), // <-- NB
      chatService.newChatMessageToTroupe(fixture.troupe1, fixture.user1, 'Hello')
      ])
      .delay(50)
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