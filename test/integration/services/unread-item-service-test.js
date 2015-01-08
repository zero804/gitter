"use strict";

var testRequire = require('../test-require');
var mockito = require('jsmockito').JsMockito;
var hamcrest = require('jshamcrest').JsHamcrest;

var Q = require('q');
var mongoUtils = testRequire('./utils/mongo-utils');
var assert = require('assert');

var times = mockito.Verifiers.times;
var never = mockito.Verifiers.never;
var once = times(1);

var allOf = hamcrest.Matchers.allOf;
var anything = hamcrest.Matchers.anything;
var hasSize = hamcrest.Matchers.hasSize;
var hasMember = hamcrest.Matchers.hasMember;


function deep(object) {
  var items = Object.keys(object).map(function(key) {
    return hasMember(key, object[key]);
  });

  return allOf.apply(null, items);
}

Q.longStackSupport = true;

describe('unread-item-service', function() {

  var blockTimer = require('../block-timer');
  before(blockTimer.on);
  after(blockTimer.off);

  describe('getOldestId', function() {
    it('getOldestId', function() {
      var unreadItemService = testRequire("./services/unread-item-service");

      var ids = ['51262ec7b1b16e01c800000e', '5124c3a95e5e661947000005'];
      var oldest = unreadItemService.testOnly.getOldestId(ids);
      assert(oldest === '5124c3a95e5e661947000005', 'Expected the older date stamp to be returned');

      // With duplicates
      ids = ['51262ec7b1b16e01c800000e', '5124c3a95e5e661947000005', '5124c3a95e5e661947000005'];
      oldest = unreadItemService.testOnly.getOldestId(ids);
      assert(oldest === '5124c3a95e5e661947000005', 'Expected the older date stamp to be returned');


      // With duplicates
      ids = [];
      oldest = unreadItemService.testOnly.getOldestId(ids);
      assert(oldest === null, 'Expected null to be returned for an empty array');
    });
  });

  describe('since-filter', function() {
    it('should do what it says on the tin', function() {
      var unreadItemService = testRequire("./services/unread-item-service");

      var underTest = unreadItemService.testOnly.sinceFilter;
      var ids = ['51adc86e010285b469000005'];
      var since = 1370343534500;

      var filters = ids.filter(underTest(since));
      assert.equal(filters.length, 0);
    });
  });

  describe('parseChat', function() {
    var chatId;
    var troupeId;
    var fromUserId;
    var userId1;
    var userId2;
    var userId3;
    var user3;
    var troupeService;
    var userService;
    var roomPermissionsModel;
    var unreadItemService;
    var troupeNoLurkers;
    var troupeSomeLurkers;
    var troupeAllLurkers;
    var singleMention;
    var groupMention;
    var duplicateMention;
    var nonMemberMention;

    beforeEach(function() {
      function makeHash() {
        var hash = [];
        for(var i = 0; i < arguments.length; i = i + 2) {
          hash.push({ userId: arguments[i], lurk: arguments[i + 1] });
        }
        return hash;
      }

      troupeId = mongoUtils.getNewObjectIdString() + "";
      troupeId = mongoUtils.getNewObjectIdString() + "";
      chatId = mongoUtils.getNewObjectIdString() + "";
      fromUserId = mongoUtils.getNewObjectIdString() + "";
      userId1 = mongoUtils.getNewObjectIdString() + "";
      userId2 = mongoUtils.getNewObjectIdString() + "";
      userId3 = mongoUtils.getNewObjectIdString() + "";
      user3 = { id: userId3 };


      singleMention = [{
        userId: userId1
      }];

      groupMention = [{
        group: true,
        userIds: [userId1, userId2]
      }];

      duplicateMention = [{
        userId: userId1
      }, {
        userId: userId1
      }];

      nonMemberMention = [{
        userId: userId3
      }];

      troupeNoLurkers = {
        users: makeHash(fromUserId, false, userId1, false, userId2, false)
      };

      troupeSomeLurkers = {
        users: makeHash(fromUserId, false, userId1, false, userId2, true)
      };

      troupeAllLurkers = {
        users: makeHash(fromUserId, true, userId1, true, userId2, true)
      };

      troupeService = mockito.mock(testRequire('./services/troupe-service'));
      userService = mockito.mock(testRequire('./services/user-service'));
      roomPermissionsModel = mockito.mockFunction();

      unreadItemService = testRequire.withProxies("./services/unread-item-service", {
        './troupe-service': troupeService,
        './user-service': userService,
        './room-permissions-model': roomPermissionsModel,
      });
    });

    it('should parse messages with no mentions, no lurkers', function(done) {
      unreadItemService.testOnly.parseChat(fromUserId, troupeNoLurkers, [])
        .then(function(result) {
          assert.deepEqual(result.notifyUserIds, [userId1, userId2]);
          assert.deepEqual(result.mentionUserIds, []);
          assert.deepEqual(result.activityOnlyUserIds, []);
          assert.deepEqual(result.notifyNewRoomUserIds, []);

        })
        .nodeify(done);
    });

    it('should parse messages with no mentions, some lurkers', function(done) {
      unreadItemService.testOnly.parseChat(fromUserId, troupeSomeLurkers, [])
        .then(function(result) {
          assert.deepEqual(result.notifyUserIds, [userId1]);
          assert.deepEqual(result.mentionUserIds, []);
          assert.deepEqual(result.activityOnlyUserIds, [userId2]);
          assert.deepEqual(result.notifyNewRoomUserIds, []);

        })
        .nodeify(done);
    });

    it('should parse messages with no mentions, all lurkers', function(done) {
      unreadItemService.testOnly.parseChat(fromUserId, troupeAllLurkers, [])
        .then(function(result) {
          assert.deepEqual(result.notifyUserIds, []);
          assert.deepEqual(result.mentionUserIds, []);
          assert.deepEqual(result.activityOnlyUserIds, [userId1, userId2]);
          assert.deepEqual(result.notifyNewRoomUserIds, []);

        })
        .nodeify(done);
    });

    it('should parse messages with user mentions to non lurkers', function(done) {
      unreadItemService.testOnly.parseChat(fromUserId, troupeNoLurkers, singleMention)
        .then(function(result) {
          assert.deepEqual(result.notifyUserIds, [userId1, userId2]);
          assert.deepEqual(result.mentionUserIds, [userId1]);
          assert.deepEqual(result.activityOnlyUserIds, []);
          assert.deepEqual(result.notifyNewRoomUserIds, []);

        })
        .nodeify(done);
    });

    it('should parse messages with user mentions to lurkers', function(done) {
      unreadItemService.testOnly.parseChat(fromUserId, troupeAllLurkers, singleMention)
        .then(function(result) {
          assert.deepEqual(result.notifyUserIds, [userId1]);
          assert.deepEqual(result.mentionUserIds, [userId1]);
          assert.deepEqual(result.activityOnlyUserIds, [userId2]);
          assert.deepEqual(result.notifyNewRoomUserIds, []);

        })
        .nodeify(done);
    });

    it('should parse messages with group mentions', function(done) {
      unreadItemService.testOnly.parseChat(fromUserId, troupeSomeLurkers, groupMention)
        .then(function(result) {
          assert.deepEqual(result.notifyUserIds, [userId1, userId2]);
          assert.deepEqual(result.mentionUserIds, [userId1, userId2]);
          assert.deepEqual(result.activityOnlyUserIds, []);
          assert.deepEqual(result.notifyNewRoomUserIds, []);

        })
        .nodeify(done);
    });

    it('should parse messages with duplicate mentions', function(done) {

      unreadItemService.testOnly.parseChat(fromUserId, troupeSomeLurkers, duplicateMention)
        .then(function(result) {
          assert.deepEqual(result.notifyUserIds, [userId1]);
          assert.deepEqual(result.mentionUserIds, [userId1]);
          assert.deepEqual(result.activityOnlyUserIds, [userId2]);
          assert.deepEqual(result.notifyNewRoomUserIds, []);

        })
        .nodeify(done);
    });

    it('should parse messages with mentions to non members who are allowed in the room', function(done) {
      mockito.when(userService).findByIds([userId3])
        .thenReturn(Q.resolve([user3]));

      mockito.when(roomPermissionsModel)(user3, 'join', troupeSomeLurkers)
        .thenReturn(Q.resolve(true));

      unreadItemService.testOnly.parseChat(fromUserId, troupeSomeLurkers, nonMemberMention)
        .then(function(result) {
          assert.deepEqual(result.notifyUserIds, [userId1, userId3]);
          assert.deepEqual(result.mentionUserIds, [userId3]);
          assert.deepEqual(result.activityOnlyUserIds, [userId2]);
          assert.deepEqual(result.notifyNewRoomUserIds, [userId3]);
        })
        .nodeify(done);
    });

    it('should parse messages with mentions to non members who are not allowed in the room', function(done) {
      mockito.when(userService).findByIds([userId3])
        .thenReturn(Q.resolve([user3]));

      mockito.when(roomPermissionsModel)(user3, 'join', troupeSomeLurkers)
        .thenReturn(Q.resolve(false));

      unreadItemService.testOnly.parseChat(fromUserId, troupeSomeLurkers, nonMemberMention)
        .then(function(result) {
          assert.deepEqual(result.notifyUserIds, [userId1]);
          assert.deepEqual(result.mentionUserIds, []);
          assert.deepEqual(result.activityOnlyUserIds, [userId2]);
          assert.deepEqual(result.notifyNewRoomUserIds, []);
        })
        .nodeify(done);
    });

    it('should parse messages with mentions to non members who are not on gitter', function(done) {
      mockito.when(userService).findByIds([userId3])
        .thenReturn(Q.resolve([]));

      unreadItemService.testOnly.parseChat(fromUserId, troupeSomeLurkers, nonMemberMention)
        .then(function(result) {
          assert.deepEqual(result.notifyUserIds, [userId1]);
          assert.deepEqual(result.mentionUserIds, []);
          assert.deepEqual(result.activityOnlyUserIds, [userId2]);
          assert.deepEqual(result.notifyNewRoomUserIds, []);
        })
        .nodeify(done);
    });

  });


  describe('removeItem', function() {
    it('should remove an item from the unread-item-store', function(done) {
      var troupeId = mongoUtils.getNewObjectIdString();
      var itemId = mongoUtils.getNewObjectIdString();
      var userId1 = mongoUtils.getNewObjectIdString();
      var userId2 = mongoUtils.getNewObjectIdString();
      var userId3 = mongoUtils.getNewObjectIdString();

      var troupeServiceMock = mockito.mock(testRequire('./services/troupe-service'));
      var appEventsMock = mockito.spy(testRequire('./app-events'));

      var unreadItemService = testRequire.withProxies("./services/unread-item-service", {
        './troupe-service': troupeServiceMock,
        '../app-events': appEventsMock
      });


      var usersWithLurkHash = {};
      usersWithLurkHash[userId1] = false;
      usersWithLurkHash[userId2] = false;
      usersWithLurkHash[userId3] = false;

      var troupe = {
        githubType: 'REPO',
        users: usersWithLurkHash
      };

      mockito.when(troupeServiceMock).findUserIdsForTroupeWithLurk(troupeId).thenReturn(Q.resolve(troupe));

      unreadItemService.testOnly.removeItem(troupeId, itemId)
        .then(function() {
          // Two calls here, not three
          mockito.verify(appEventsMock, once).unreadItemsRemoved(userId1, troupeId);
          mockito.verify(appEventsMock, once).unreadItemsRemoved(userId2, troupeId);
          mockito.verify(appEventsMock, once).unreadItemsRemoved(userId3, troupeId);

          return unreadItemService.getBadgeCountsForUserIds([userId1, userId2, userId3])
            .then(function(result) {
              assert.equal(result[userId1], 0);
              assert.equal(result[userId2], 0);
              assert.equal(result[userId3], 0);
            });

        })
        .nodeify(done);

    });
  });

  describe('createChatUnreadItems', function() {
    var chatId;
    var troupeId;
    var fromUserId;
    var userId1;
    var userId2;
    var userId3;
    var user3;
    var troupeService;
    var appEvents;
    var userService;
    var roomPermissionsModel;
    var unreadItemService;
    var troupeNoLurkers;
    var troupeSomeLurkers;
    var troupeAllLurkers;
    var chatWithNoMentions;
    var chatWithSingleMention;
    var chatWithGroupMention;
    var chatWithDuplicateMention;
    var chatWithNonMemberMention;

    beforeEach(function() {
      function makeHash() {
        var hash = [];
        for(var i = 0; i < arguments.length; i = i + 2) {
          hash.push({ userId: arguments[i], lurk: arguments[i + 1] });
        }
        return hash;
      }

      troupeId = mongoUtils.getNewObjectIdString() + "";
      chatId = mongoUtils.getNewObjectIdString() + "";
      fromUserId = mongoUtils.getNewObjectIdString() + "";
      userId1 = mongoUtils.getNewObjectIdString() + "";
      userId2 = mongoUtils.getNewObjectIdString() + "";
      userId3 = mongoUtils.getNewObjectIdString() + "";
      user3 = { id: userId3 };

      chatWithNoMentions = {
        id: chatId,
        mentions: []
      };

      chatWithSingleMention = {
        id: chatId,
        mentions: [{
          userId: userId1
        }]
      };

      chatWithGroupMention = {
        id: chatId,
        mentions: [{
          group: true,
          userIds: [userId1, userId2]
        }]
      };

      chatWithDuplicateMention = {
        id: chatId,
        mentions: [{
          userId: userId1
        }, {
          userId: userId1
        }]
      };

      chatWithNonMemberMention = {
        id: chatId,
        mentions: [{
          userId: userId3
        }]
      };

      troupeNoLurkers = {
        id: troupeId,
        users: makeHash(fromUserId, false, userId1, false, userId2, false)
      };

      troupeSomeLurkers = {
        id: troupeId,
        users: makeHash(fromUserId, false, userId1, false, userId2, true)
      };

      troupeAllLurkers = {
        id: troupeId,
        users: makeHash(fromUserId, true, userId1, true, userId2, true)
      };

      troupeService = mockito.mock(testRequire('./services/troupe-service'));
      userService = mockito.mock(testRequire('./services/user-service'));
      appEvents = mockito.mock(testRequire('./app-events'));
      roomPermissionsModel = mockito.mockFunction();

      unreadItemService = testRequire.withProxies("./services/unread-item-service", {
        './troupe-service': troupeService,
        './user-service': userService,
        '../app-events': appEvents,
        './room-permissions-model': roomPermissionsModel,
      });
    });

    it('should create messages with no mentions, no lurkers', function(done) {
      unreadItemService.createChatUnreadItems(fromUserId, troupeNoLurkers, chatWithNoMentions)
        .then(function() {
          mockito.verify(appEvents, never()).newUnreadItem(fromUserId, anything(), anything());
          mockito.verify(appEvents).newUnreadItem(userId1, troupeId, hasMember("chat", [chatId]));
          mockito.verify(appEvents).newUnreadItem(userId2, troupeId, hasMember("chat", [chatId]));

          mockito.verify(appEvents, never()).troupeUnreadCountsChange(hasMember('userId', fromUserId));
          mockito.verify(appEvents).troupeUnreadCountsChange(deep({userId: userId1, troupeId: troupeId, total: 1, mentions: undefined }));
          mockito.verify(appEvents).troupeUnreadCountsChange(deep({userId: userId2, troupeId: troupeId, total: 1, mentions: undefined  }));
        })
        .nodeify(done);
    });

    it('should create messages with no mentions, some lurkers', function(done) {
      unreadItemService.createChatUnreadItems(fromUserId, troupeSomeLurkers, chatWithNoMentions)
        .then(function() {
          mockito.verify(appEvents, never()).newUnreadItem(fromUserId, anything(), anything());
          mockito.verify(appEvents).newUnreadItem(userId1, troupeId, hasMember("chat", [chatId]));

          mockito.verify(appEvents, never()).troupeUnreadCountsChange(hasMember('userId', fromUserId));
          mockito.verify(appEvents).troupeUnreadCountsChange(deep({userId: userId1, troupeId: troupeId, total: 1, mentions: undefined }));

          mockito.verify(appEvents).newLurkActivity(deep({ userId: userId2, troupeId: troupeId }));
        })
        .nodeify(done);
    });

    it('should create messages with no mentions, all lurkers', function(done) {
      unreadItemService.createChatUnreadItems(fromUserId, troupeAllLurkers, chatWithNoMentions)
        .then(function() {
          mockito.verify(appEvents, never()).newUnreadItem(anything(), anything(), anything());
          mockito.verify(appEvents, never()).troupeUnreadCountsChange(anything());

          mockito.verify(appEvents).newLurkActivity(deep({ userId: userId1, troupeId: troupeId }));
          mockito.verify(appEvents).newLurkActivity(deep({ userId: userId2, troupeId: troupeId }));

        })
        .nodeify(done);
    });

    it('should create messages with user mentions to non lurkers', function(done) {
      unreadItemService.createChatUnreadItems(fromUserId, troupeNoLurkers, chatWithSingleMention)
        .then(function() {
          mockito.verify(appEvents, never()).newUnreadItem(fromUserId, anything(), anything());
          mockito.verify(appEvents).newUnreadItem(userId1, troupeId, hasMember("chat", [chatId]));
          mockito.verify(appEvents).newUnreadItem(userId2, troupeId, hasMember("chat", [chatId]));

          mockito.verify(appEvents, never()).troupeUnreadCountsChange(hasMember('userId', fromUserId));
          mockito.verify(appEvents).troupeUnreadCountsChange(deep({userId: userId1, troupeId: troupeId, total: 1, mentions: 1 }));
          mockito.verify(appEvents).troupeUnreadCountsChange(deep({userId: userId2, troupeId: troupeId, total: 1  }));
        })
        .nodeify(done);
    });

    it('should create messages with user mentions to lurkers', function(done) {
      unreadItemService.createChatUnreadItems(fromUserId, troupeAllLurkers, chatWithSingleMention)
        .then(function() {
          mockito.verify(appEvents, never()).newUnreadItem(fromUserId, anything(), anything());

          mockito.verify(appEvents).newUnreadItem(userId1, troupeId, hasMember("chat", [chatId]));
          mockito.verify(appEvents).troupeUnreadCountsChange(deep({userId: userId1, troupeId: troupeId, total: 1, mentions: 1 }));

          mockito.verify(appEvents).newLurkActivity(deep({ userId: userId2, troupeId: troupeId }));
        })
        .nodeify(done);
    });

    it('should create messages with group mentions', function(done) {
      unreadItemService.createChatUnreadItems(fromUserId, troupeSomeLurkers, chatWithGroupMention)
        .then(function() {
          mockito.verify(appEvents, never()).newUnreadItem(fromUserId, anything(), anything());
          mockito.verify(appEvents).newUnreadItem(userId1, troupeId, hasMember("chat", [chatId]));
          mockito.verify(appEvents).newUnreadItem(userId2, troupeId, hasMember("chat", [chatId]));

          mockito.verify(appEvents, never()).troupeUnreadCountsChange(hasMember('userId', fromUserId));
          mockito.verify(appEvents).troupeUnreadCountsChange(deep({userId: userId1, troupeId: troupeId, total: 1, mentions: 1 }));
          mockito.verify(appEvents).troupeUnreadCountsChange(deep({userId: userId2, troupeId: troupeId, total: 1, mentions: 1  }));

        })
        .nodeify(done);
    });

    it('should create messages with duplicate mentions', function(done) {

      unreadItemService.createChatUnreadItems(fromUserId, troupeSomeLurkers, chatWithDuplicateMention)
        .then(function() {
          mockito.verify(appEvents, never()).newUnreadItem(fromUserId, anything(), anything());
          mockito.verify(appEvents).newUnreadItem(userId1, troupeId, hasMember("chat", [chatId]));
          mockito.verify(appEvents, never()).newUnreadItem(userId2, troupeId, anything());

          mockito.verify(appEvents, never()).troupeUnreadCountsChange(hasMember('userId', fromUserId));
          mockito.verify(appEvents).troupeUnreadCountsChange(deep({userId: userId1, troupeId: troupeId, total: 1, mentions: 1 }));

        })
        .nodeify(done);
    });

  });

  describe('updateChatUnreadItems', function() {
    var chatId;
    var troupeId;
    var fromUserId;
    var userId1;
    var userId2;
    var userId3;
    var user3;
    var troupeService;
    var appEvents;
    var userService;
    var roomPermissionsModel;
    var unreadItemService;
    var troupeNoLurkers;
    var troupeSomeLurkers;
    var troupeAllLurkers;
    var chatWithNoMentions;
    var chatWithSingleMention;
    var chatWithGroupMention;
    var chatWithDuplicateMention;
    var chatWithNonMemberMention;

    beforeEach(function() {
      function makeHash() {
        var hash = [];
        for(var i = 0; i < arguments.length; i = i + 2) {
          hash.push({ userId: arguments[i], lurk: arguments[i + 1] });
        }
        return hash;
      }

      troupeId = mongoUtils.getNewObjectIdString() + "";
      chatId = mongoUtils.getNewObjectIdString() + "";
      fromUserId = mongoUtils.getNewObjectIdString() + "";
      userId1 = mongoUtils.getNewObjectIdString() + "";
      userId2 = mongoUtils.getNewObjectIdString() + "";
      userId3 = mongoUtils.getNewObjectIdString() + "";
      user3 = { id: userId3 };

      chatWithNoMentions = {
        id: chatId,
        mentions: []
      };

      chatWithSingleMention = {
        id: chatId,
        mentions: [{
          userId: userId1
        }]
      };

      chatWithGroupMention = {
        id: chatId,
        mentions: [{
          group: true,
          userIds: [userId1, userId2]
        }]
      };

      chatWithDuplicateMention = {
        id: chatId,
        mentions: [{
          userId: userId1
        }, {
          userId: userId1
        }]
      };

      chatWithNonMemberMention = {
        id: chatId,
        mentions: [{
          userId: userId3
        }]
      };

      troupeNoLurkers = {
        id: troupeId,
        users: makeHash(fromUserId, false, userId1, false, userId2, false)
      };

      troupeSomeLurkers = {
        id: troupeId,
        users: makeHash(fromUserId, false, userId1, false, userId2, true)
      };

      troupeAllLurkers = {
        id: troupeId,
        users: makeHash(fromUserId, true, userId1, true, userId2, true)
      };

      troupeService = mockito.mock(testRequire('./services/troupe-service'));
      userService = mockito.mock(testRequire('./services/user-service'));
      appEvents = mockito.mock(testRequire('./app-events'));
      roomPermissionsModel = mockito.mockFunction();

      unreadItemService = testRequire.withProxies("./services/unread-item-service", {
        './troupe-service': troupeService,
        './user-service': userService,
        '../app-events': appEvents,
        './room-permissions-model': roomPermissionsModel,
      });
    });

    it('should handle updates that add mentions to a message with no mentions', function(done) {
      unreadItemService.updateChatUnreadItems(fromUserId, troupeNoLurkers, chatWithNoMentions, [])
        .then(function() {
          mockito.verify(appEvents, never()).newUnreadItem(fromUserId, anything(), anything());
          mockito.verify(appEvents).newUnreadItem(userId1, troupeId, hasMember("chat", [chatId]));
          mockito.verify(appEvents).newUnreadItem(userId2, troupeId, hasMember("chat", [chatId]));

          mockito.verify(appEvents, never()).troupeUnreadCountsChange(hasMember('userId', fromUserId));
          mockito.verify(appEvents).troupeUnreadCountsChange(deep({userId: userId1, troupeId: troupeId, total: 1, mentions: undefined }));
          mockito.verify(appEvents).troupeUnreadCountsChange(deep({userId: userId2, troupeId: troupeId, total: 1, mentions: undefined  }));
        })
        .nodeify(done);
    });

    /* TODO: more tests here */

  });

});
