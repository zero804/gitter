/* jshint node:true */
/*global describe:true, it:true */
"use strict";

var testRequire = require('../../test-require');
var assert      = require("assert");
var mockito     = require('jsmockito').JsMockito;
var Q           = require('q');

var times  = mockito.Verifiers.times;
var never  = mockito.Verifiers.never();
var once   = times(1);
var twice  = times(2);
var thrice = times(3);


var unreadItemServiceMock = mockito.spy(testRequire('./services/unread-item-service'));
var emailNotificationServiceMock = mockito.mock(testRequire('./services/email-notification-service'));

var sendEmailNotifications = testRequire.withProxies('./services/notifications/email-notification-generator-service', {
  './email-notification-service': emailNotificationServiceMock,
  '../unread-item-service': unreadItemServiceMock
});

mockito.when(unreadItemServiceMock).markUserAsEmailNotified().thenReturn();

describe.skip('email-notification-service', function() {

  it('should do what it says on the tin', function(done) {
    return sendEmailNotifications(Date.now())
      .then(function() {
      })
      .nodeify(done);
  });

});