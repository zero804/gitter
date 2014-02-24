/* jshint node:true */
/*global describe:true, it:true, before:true */

"use strict";

var testRequire   = require('../../test-require');
var assert        = require("assert");
var mockito       = require('jsmockito').JsMockito;
var Q             = require('q');
var chatService   = testRequire('./services/chat-service');
var fixtureLoader = require('../../test-fixtures');

var times  = mockito.Verifiers.times;
var never  = mockito.Verifiers.never();
var once   = times(1);
var twice  = times(2);
var thrice = times(3);


var unreadItemServiceMock = mockito.spy(testRequire('./services/unread-item-service'));
var emailNotificationServiceMock = mockito.spy(testRequire('./services/email-notification-service'));

var sendEmailNotifications = testRequire.withProxies('./services/notifications/email-notification-generator-service', {
  '../email-notification-service': emailNotificationServiceMock,
  '../unread-item-service': unreadItemServiceMock
});
unreadItemServiceMock.install();

mockito.when(unreadItemServiceMock).markUserAsEmailNotified().thenReturn();

var fixture = {};

before(fixtureLoader(fixture, {
  user1: { },
  user2: { },
  troupe1: { users: ['user1', 'user2']}
}));

describe('email-notification-generator-service', function() {

  it('should do what it says on the tin', function(done) {
    var c = 0;
    mockito.when(emailNotificationServiceMock).sendUnreadItemsNotification().then(function() {
      c++;
    });

    chatService.newChatMessageToTroupe(fixture.troupe1, fixture.user1, 'Hello', function(err) {
      if(err) return done(err);
      setTimeout(function() {
        return sendEmailNotifications(Date.now())
          .then(function() {
            assert(c > 0);
          })
          .nodeify(done);

      }, 10);

    });

  });

});