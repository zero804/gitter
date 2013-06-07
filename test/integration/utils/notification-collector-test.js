/*jslint node: true */
/*global describe:true, it: true, beforeEach:true, afterEach:true */
"use strict";

var testRequire = require('../test-require');
var assert = require('assert');
var NotificationCollector = testRequire('./utils/notification-collector');
var _ = require('underscore');

function mockStrategy(userTroupes, callback) {
  var result = {
    online: [],
    offline: []
  };

  userTroupes.forEach(function(userTroupe) {
    if(userTroupe.userId.indexOf('-on') > 0) {
      result.online.push(userTroupe);
    } else if(userTroupe.userId.indexOf('-off') > 0) {
      result.offline.push(userTroupe);
    }
  });

  callback(null, result);
}

describe('notification-collection', function() {
  it('should collect notifications for one user', function(done) {

    var underTest = new NotificationCollector({ userCategorisationStrategy: mockStrategy, collectionTime: 1 });

    underTest.on('collection:online', function(userTroupes) {
      assert.equal(userTroupes.length, 2);

      done();
    });

    underTest.incomingNotification('user1-on', 'file', ['f1','f2'], 'troupeId1');
    underTest.incomingNotification('user1-on', 'chat', ['c1','c2'], 'troupeId1');
    underTest.incomingNotification('user1-on', 'chat', ['c1','c2'], 'troupeId2');
  });

  it('should collect notifications for two user', function(done) {

    var underTest = new NotificationCollector({ userCategorisationStrategy: mockStrategy, collectionTime: 1 });

    underTest.on('collection:online', function(userTroupes) {
      assert.equal(userTroupes.length, 2);

      done();
    });

    underTest.incomingNotification('user1-on', 'file', ['c1','c2'], 'troupeId1');
    underTest.incomingNotification('user2-on', 'chat', ['c1','c2'], 'troupeId2');
  });

  it('should collect notifications for users categorized differently', function(done) {
    var countingDone = _.after(2, done);

    var underTest = new NotificationCollector({ userCategorisationStrategy: mockStrategy, collectionTime: 1 });

    underTest.on('collection:online', function(userTroupes) {
      assert.equal(userTroupes.length, 1);
      countingDone();
    });

    underTest.on('collection:offline', function(userTroupes) {
      assert.equal(userTroupes.length, 1);

      countingDone();
    });

    underTest.incomingNotification('user1-on', 'file', ['f1','f2'], 'troupeId1');
    underTest.incomingNotification('user1-on', 'chat', ['c1','c2'], 'troupeId1');
    underTest.incomingNotification('user2-off', 'chat', ['c1','c2'], 'troupeId2');
  });


});