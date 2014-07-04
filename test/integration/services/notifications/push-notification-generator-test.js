/*jslint node: true, unused:true */
/*global describe:true, it: true */
"use strict";

var testRequire = require('../../test-require');
var Q = require('q');
var mockito = require('jsmockito').JsMockito;

var times = mockito.Verifiers.times;
var never = times(0);
var once = times(1);

var userTroupeSettingsServiceStub = {
  '../user-troupe-settings-service': {
    getMultiUserTroupeSettings: function() {
      return Q.fcall(function() { return {}; });
    }
  }
};

var pushNotificationServiceStub = {
  canUnlockForNotification: function(x, y, z, callback) { callback(null, {}); }
};

var userServiceStub = {
  findById: function(userId, callback) { callback(null, {});}
};

var unreadItemServiceStub = {
  getUnreadItemsForUserTroupeSince: function(x, y, z, callback) {
    callback(null, { '1234567890': 'veryunread' });
  }
};

var notificationSerializerStub = {
  getStrategy: function() {
    return function() {};
  },
  serialize: function(x, y, callback) {
    if(x === '1234567890') {
      callback(null, {id: 'someTroupeId', name: 'someName'});
    } else {
      callback(null, []);
    }
  }
};

describe('push notification generator service', function() {

  it('should send a notification', function(done) {
    var mockSendUserNotification = mockito.mockFunction();
    mockito.when(mockSendUserNotification)().then(function(x, y, callback) { callback(); });

    var service = testRequire.withProxies('./services/notifications/push-notification-generator', {
      '../user-troupe-settings-service': userTroupeSettingsServiceStub,
      '../push-notification-service': pushNotificationServiceStub,
      '../user-service': userServiceStub,
      '../../gateways/push-notification-gateway': {
        sendUserNotification: mockSendUserNotification
      },
      '../unread-item-service': unreadItemServiceStub,
      '../../serializers/notification-serializer': notificationSerializerStub
    });

    service.sendUserTroupeNotification({ userId: 'userId1234', troupeId: '1234567890' }, 1, 'some setting', function(err) {
      if(err) return done(err);

      mockito.verify(mockSendUserNotification, once)();
      done();
    });
  });

  it('should not send for muted rooms', function(done) {
    var mockSendUserNotification = mockito.mockFunction();
    mockito.when(mockSendUserNotification)().then(function(x, y, callback) { callback(); });

    var service = testRequire.withProxies('./services/notifications/push-notification-generator', {
      '../user-troupe-settings-service': userTroupeSettingsServiceStub,
      '../push-notification-service': pushNotificationServiceStub,
      '../user-service': userServiceStub,
      '../../gateways/push-notification-gateway': {
        sendUserNotification: mockSendUserNotification
      },
      '../unread-item-service': unreadItemServiceStub,
      '../../serializers/notification-serializer': notificationSerializerStub
    });

    service.sendUserTroupeNotification({ userId: 'userId1234', troupeId: '1234567890' }, 1, 'mute', function(err) {
      if(err) return done(err);

      mockito.verify(mockSendUserNotification, never)();
      done();
    });
  });

});

