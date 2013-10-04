/*jshint globalstrict:true, trailing:false, unused:true, node:true */
/*global describe:true, it:true, before:false, after:false */
'use strict';

var testRequire = require('./../test-require');
var fixtureLoader = require('../test-fixtures');
var assert = require('assert');
var mockito = require('jsmockito').JsMockito;
var Q = require('q');

var times = mockito.Verifiers.times;
var never = mockito.Verifiers.never();
var once = times(1);
var twice = times(2);
var thrice = times(3);


describe('Contact Signup Notifier', function() {

  describe('onUserAccountActivated with online users', function() {
    var fixture = {};

    var newUserEmail = fixtureLoader.generateEmail();

    before(fixtureLoader(fixture, {
      user1: { },
      user2: { email: newUserEmail },
      contact1: { user: 'user1', emails: [newUserEmail] }
    }));

    it('should notify users via online notification on account activated', function(done) {
      var user1 = fixture.user1;
      var user2 = fixture.user2;

      var onEmailConfirmedCb, onUserAccountActivatedCb;
      var emailNotificationServiceMock = mockito.spy(testRequire('./services/email-notification-service'));

      var appEventsMock = {
        localOnly: {
          onEmailConfirmed: function(pOnEmailConfirmedCb) {
            onEmailConfirmedCb = pOnEmailConfirmedCb;
          },
          onUserAccountActivated: function(pOnUserAccountActivatedCb) {
            onUserAccountActivatedCb = pOnUserAccountActivatedCb;
          }
        },
        userNotification: function(data) {
          assert.equal(data.userId, user1.id);
        }
      };

      var presenceServiceMock = mockito.mock(testRequire('./services/presence-service'));


      var underTest = testRequire.withProxies('./services/contact-signup-notifier', {
        './email-notification-service': emailNotificationServiceMock,
        './presence-service': presenceServiceMock,
        '../app-events': appEventsMock
      });
      var online = {};
      online[user1.id] = 'online';
      mockito.when(presenceServiceMock).categorizeUsersByOnlineStatus().thenReturn(Q.resolve(online));

      underTest.install();

      return onUserAccountActivatedCb({ userId: user2.id })
        .then(function() {
          mockito.verify(emailNotificationServiceMock, never).sendContactSignupNotification();
        })
        .nodeify(done);
    });

    after(function() {
      fixture.cleanup();
    });

  });


  describe('onUserAccountActivated with offline users', function() {
    var fixture = {};

    var newUserEmail = fixtureLoader.generateEmail();

    before(fixtureLoader(fixture, {
      user1: { },
      user2: { email: newUserEmail },
      contact1: { user: 'user1', emails: [newUserEmail] }
    }));

    it('should notify users via email on account activated', function(done) {
      var user2 = fixture.user2;

      var onEmailConfirmedCb, onUserAccountActivatedCb;
      var emailNotificationServiceMock = mockito.spy(testRequire('./services/email-notification-service'));

      var appEventsMock = {
        localOnly: {
          onEmailConfirmed: function(pOnEmailConfirmedCb) {
            onEmailConfirmedCb = pOnEmailConfirmedCb;
          },
          onUserAccountActivated: function(pOnUserAccountActivatedCb) {
            onUserAccountActivatedCb = pOnUserAccountActivatedCb;
          }
        },
        userNotification: function() {
          assert.fail('No notification should take place');
        }
      };

      var presenceServiceMock = mockito.mock(testRequire('./services/presence-service'));


      var underTest = testRequire.withProxies('./services/contact-signup-notifier', {
        './email-notification-service': emailNotificationServiceMock,
        './presence-service': presenceServiceMock,
        '../app-events': appEventsMock
      });
      mockito.when(presenceServiceMock).categorizeUsersByOnlineStatus().thenReturn(Q.resolve({}));

      underTest.install();

      return onUserAccountActivatedCb({ userId: user2.id })
        .then(function() {
          mockito.verify(emailNotificationServiceMock, once).sendContactSignupNotification();
        })
        .nodeify(done);
    });

    after(function() {
      fixture.cleanup();
    });

  });


  describe('onUserAccountActivated with users who are already connected', function() {
    var fixture = {};

    var newUserEmail = fixtureLoader.generateEmail();

    before(fixtureLoader(fixture, {
      user1: { },
      user2: { email: newUserEmail },
      contact1: { user: 'user1', emails: [newUserEmail] },
      troupe1: { users: ['user1', 'user2'], oneToOne: true }
    }));

    it('should notify users via email on account activated', function(done) {
      var user2 = fixture.user2;

      var onEmailConfirmedCb, onUserAccountActivatedCb;
      var emailNotificationServiceMock = mockito.spy(testRequire('./services/email-notification-service'));

      var appEventsMock = {
        localOnly: {
          onEmailConfirmed: function(pOnEmailConfirmedCb) {
            onEmailConfirmedCb = pOnEmailConfirmedCb;
          },
          onUserAccountActivated: function(pOnUserAccountActivatedCb) {
            onUserAccountActivatedCb = pOnUserAccountActivatedCb;
          }
        },
        userNotification: function() {
          assert.fail('No notification should take place');
        }
      };

      var presenceServiceMock = mockito.mock(testRequire('./services/presence-service'));

      var underTest = testRequire.withProxies('./services/contact-signup-notifier', {
        './email-notification-service': emailNotificationServiceMock,
        './presence-service': presenceServiceMock,
        '../app-events': appEventsMock
      });
      mockito.when(presenceServiceMock).categorizeUsersByOnlineStatus().thenReturn(Q.resolve({}));

      underTest.install();

      return onUserAccountActivatedCb({ userId: user2.id })
        .then(function() {
          mockito.verify(emailNotificationServiceMock, never).sendContactSignupNotification();
        })
        .nodeify(done);
    });

    after(function() {
      fixture.cleanup();
    });

  });
});
