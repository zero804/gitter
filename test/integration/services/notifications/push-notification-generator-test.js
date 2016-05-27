/*jslint node: true, unused:true */
/*global describe:true, it: true */
"use strict";

var testRequire = require('../../test-require');
var Promise = require('bluebird');
var mockito = require('jsmockito').JsMockito;
var assert = require('assert');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');

var times = mockito.Verifiers.times;
var once = times(1);

var pushNotificationFilterStub = {
  canUnlockForNotification: function() { return Promise.resolve(Date.now()); }
};

var userServiceStub = {
  findById: function(userId, callback) { callback(null, {});}
};

var unreadItemServiceStub = {
  getUnreadItemsForUserTroupeSince: function() {
    return Promise.resolve([['chat1234567890'], []]);
  }
};

var notificationSerializerStub = {
  TroupeIdStrategy: function() { this.name = 'troupeId'; },
  ChatIdStrategy: function() { this.name = 'chatId'; },
  serialize: function(item, strategy) {
    assert.strictEqual(strategy.name, 'chatId');
    return Promise.resolve([{id: 'serializedChatId', text: 'serializedText', fromUser: {displayName: 'serializedFromUser'}}]);
  },
  serializeObject: function(item, strategy) {
    assert.strictEqual(strategy.name, 'troupeId');
    return Promise.resolve({id: 'serializedId', name: 'serializedName', url: 'serializedUrl'});
  }
};

describe('push notification generator service', function() {

  it('should send a notification', function(done) {
    var mockSendUserNotification = mockito.mockFunction();
    mockito.when(mockSendUserNotification)().then(function() { return Promise.resolve(); });

    var service = testRequire.withProxies('./services/notifications/push-notification-generator', {
      'gitter-web-push-notification-filter': pushNotificationFilterStub,
      '../user-service': userServiceStub,
      '../../gateways/push-notification-gateway': {
        sendUserNotification: mockSendUserNotification
      },
      '../unread-items': unreadItemServiceStub,
      '../../serializers/notification-serializer': notificationSerializerStub
    });

    return service.sendUserTroupeNotification('userId1234', '1234567890', 1)
      .then(function() {
        mockito.verify(mockSendUserNotification, once)();
      })
      .nodeify(done);
  });

  it('should serialize troupes and chats correctly', function(done) {
    var mockSendUserNotification = function(userId, notification) {
      assert.equal(userId, 'userId1234');
      assert.equal(notification.link, '/mobile/chat#serializedId');
      assert.equal(notification.roomId, "serializedId");
      assert.equal(notification.roomName, "serializedName");
      assert(notification.message);
      assert(notification.message.indexOf('serializedFromUser') >= 0, 'serialized unread chat data not found');
      return Promise.resolve();
    };

    var service = testRequire.withProxies('./services/notifications/push-notification-generator', {
      'gitter-web-push-notification-filter': pushNotificationFilterStub,
      '../user-service': userServiceStub,
      '../../gateways/push-notification-gateway': {
        sendUserNotification: mockSendUserNotification
      },
      '../unread-items': unreadItemServiceStub,
      '../../serializers/notification-serializer': notificationSerializerStub
    });

    return service.sendUserTroupeNotification('userId1234', '1234567890', 1)
      .nodeify(done);
  });

  describe('selectChatsForNotification', function() {
    var service;

    before(function() {
      service = testRequire('./services/notifications/push-notification-generator');
    });

    it('should select the first two messages when there are two messages', function() {
      assert.deepEqual(service.testOnly.selectChatsForNotification(['1', '2'], []), ['1', '2']);
    });

    it('should select the first three messages when there are four messages', function() {
      assert.deepEqual(service.testOnly.selectChatsForNotification(['1', '2', '3', '4'], []), ['1', '2', '3']);
    });

    it('should select the first three messages when the first message is a mention', function() {
      assert.deepEqual(service.testOnly.selectChatsForNotification(['1', '2', '3', '4', '5'], ['1']), ['1', '2', '3']);
    });

    it('should select the last three messages when the last message is a mention', function() {
      assert.deepEqual(service.testOnly.selectChatsForNotification(['1', '2', '3', '4', '5'], ['5']), ['3', '4', '5']);
    });

    it('should select the two closest messages when the mention is in the middle', function() {
      assert.deepEqual(service.testOnly.selectChatsForNotification(['1', '2', '3', '4', '5'], ['3']), ['2', '3', '4']);
    });

  });

  describe('serializeItems #slow', function() {
    var fixture = {};
    before(fixtureLoader(fixture, {
      user1: {},
      troupe1: {users: ['user1']},
      message1: {
        user: 'user1',
        troupe: 'troupe1',
        readBy: [],
        text: 'foo',
        sent: new Date('2014-01-01T00:00:00.000Z')
      },
      message2: {
        user: 'user1',
        troupe: 'troupe1',
        readBy: [],
        text: 'bar',
        sent: new Date('2014-01-02T00:00:00.000Z')
      }
    }));

    after(function() {
      return fixture.cleanup();
    });

    it('should serialize for troupe, user and chats', function() {
      var troupeId = fixture.troupe1.id;
      var recipientUserId = fixture.user1.id;
      var chatIds = [fixture.message1.id, fixture.message2.id];

      // bring in a fresh service so we don't get the stubbed serializer
      var service = testRequire('./services/notifications/push-notification-generator');
      return service.testOnly.serializeItems(troupeId, recipientUserId, chatIds)
        .spread(function(troupe, chats) {
          assert.equal(troupe.id, troupeId);
          assert.equal(chats[0].text, 'foo');
          assert.equal(chats[1].text, 'bar');
        });
    });
  });

});
