"use strict";

var testRequire = require('../test-require');
var mockito = require('jsmockito').JsMockito;
var hamcrest = require('jshamcrest').JsHamcrest;

var Q = require('q');
var assert = require('assert');

var times = mockito.Verifiers.times;
var never = mockito.Verifiers.never;
var once = times(1);

var allOf = hamcrest.Matchers.allOf;
var anything = hamcrest.Matchers.anything;
var hasMember = hamcrest.Matchers.hasMember;

function makeHash() {
  var hash = [];
  for(var i = 0; i < arguments.length; i = i + 2) {
    hash[arguments[i]] = arguments[i + 1];
  }
  return hash;
}


function deep(object) {
  var items = Object.keys(object).map(function(key) {
    return hasMember(key, object[key]);
  });

  return allOf.apply(null, items);
}

Q.longStackSupport = true;

describe('unread-item-service', function() {
  var unreadItemService, mongoUtils;

  before(function() {
    /* Don't send batches out */
    unreadItemService = testRequire("./services/unread-item-service");
    mongoUtils = testRequire('./utils/mongo-utils');
    unreadItemService.testOnly.setSendBadgeUpdates(false);
  });

  var blockTimer = require('../block-timer');
  before(blockTimer.on);
  after(blockTimer.off);

  describe('getOldestId', function() {
    it('getOldestId', function() {
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
      var d1 = new Date('2012-01-01T00:00:00Z').valueOf();
      var d2 = new Date('2013-01-01T00:00:00Z').valueOf();
      var d3 = new Date('2014-01-01T00:00:00Z').valueOf();
      var d4 = new Date('2015-01-01T00:00:00Z').valueOf();

      var o1 = mongoUtils.createIdForTimestamp(d1);
      var o2 = mongoUtils.createIdForTimestamp(d2);
      var o3 = mongoUtils.createIdForTimestamp(d3);
      var underTest = unreadItemService.testOnly.sinceFilter;

      var ids = [o1.toString(), o2.toString(), o3.toString()];

      assert.deepEqual(ids.filter(underTest(d1)), [o1.toString(), o2.toString(), o3.toString()]);
      assert.deepEqual(ids.filter(underTest(d2)), [o2.toString(), o3.toString()]);
      assert.deepEqual(ids.filter(underTest(d3)), [o3.toString()]);
      assert.deepEqual(ids.filter(underTest(d4)), []);
    });
  });

  describe('mocked out', function() {

    describe('parseChat', function() {
      var chatId;
      var troupeId, troupeId2, troupeId3;
      var fromUserId;
      var userId1;
      var userId2;
      var userId3;
      var user3;
      var roomMembershipService;
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
      var troupeNoLurkersUserHash, troupeSomeLurkersUserHash, troupeAllLurkersUserHash;

      beforeEach(function() {
        troupeId = mongoUtils.getNewObjectIdString() + "";
        troupeId2 = mongoUtils.getNewObjectIdString() + "";
        troupeId3 = mongoUtils.getNewObjectIdString() + "";
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
          id: troupeId,
          _id: troupeId,
        };
        troupeNoLurkersUserHash = makeHash(fromUserId, false, userId1, false, userId2, false);

        troupeSomeLurkers = {
          id: troupeId2,
          _id: troupeId2,
        };
        troupeSomeLurkersUserHash = makeHash(fromUserId, false, userId1, false, userId2, true);

        troupeAllLurkers = {
          id: troupeId3,
          _id: troupeId3,
        };
        troupeAllLurkersUserHash = makeHash(fromUserId, true, userId1, true, userId2, true);

        roomMembershipService = mockito.mock(testRequire('./services/room-membership-service'));
        userService = mockito.mock(testRequire('./services/user-service'));
        roomPermissionsModel = mockito.mockFunction();

        mockito.when(roomMembershipService).findMembersForRoomWithLurk(troupeId).thenReturn(Q.resolve(troupeNoLurkersUserHash));
        mockito.when(roomMembershipService).findMembersForRoomWithLurk(troupeId2).thenReturn(Q.resolve(troupeSomeLurkersUserHash));
        mockito.when(roomMembershipService).findMembersForRoomWithLurk(troupeId3).thenReturn(Q.resolve(troupeAllLurkersUserHash));

        unreadItemService = testRequire.withProxies("./services/unread-item-service", {
          './room-membership-service': roomMembershipService,
          './user-service': userService,
          './room-permissions-model': roomPermissionsModel,
        });
        unreadItemService.testOnly.setSendBadgeUpdates(false);

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
        var troupeId1 = mongoUtils.getNewObjectIdString();
        var chatId = mongoUtils.getNewObjectIdString();
        var userId1 = mongoUtils.getNewObjectIdString();
        var userId2 = mongoUtils.getNewObjectIdString();
        var userId3 = mongoUtils.getNewObjectIdString();

        var roomMembershipServiceMock = mockito.mock(testRequire('./services/room-membership-service'));
        var appEvents = mockito.spy(testRequire('gitter-web-appevents'));

        var unreadItemService = testRequire.withProxies("./services/unread-item-service", {
          './room-membership-service': roomMembershipServiceMock,
          'gitter-web-appevents': appEvents
        });
        unreadItemService.testOnly.setSendBadgeUpdates(false);

        var usersWithLurkHash = {};
        usersWithLurkHash[userId1] = false;
        usersWithLurkHash[userId2] = false;
        usersWithLurkHash[userId3] = false;

        mockito.when(roomMembershipServiceMock).findMembersForRoomWithLurk(troupeId1).thenReturn(Q.resolve(usersWithLurkHash));

        unreadItemService.testOnly.removeItem(troupeId1, chatId)
          .then(function() {
            // Two calls here, not three
            mockito.verify(appEvents, once).unreadItemsRemoved(userId1, troupeId1);
            mockito.verify(appEvents, once).unreadItemsRemoved(userId2, troupeId1);
            mockito.verify(appEvents, once).unreadItemsRemoved(userId3, troupeId1);

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
      var troupeId, troupeId2, troupeId3;
      var fromUserId;
      var userId1;
      var userId2;
      var userId3;
      var user3;
      var roomMembershipService;
      var appEvents;
      var userService;
      var roomPermissionsModel;
      var unreadItemService;
      var categoriseUserInRoom;
      var troupeNoLurkers;
      var troupeSomeLurkers;
      var troupeAllLurkers;
      var chatWithNoMentions;
      var chatWithSingleMention;
      var chatWithGroupMention;
      var chatWithDuplicateMention;
      var chatWithNonMemberMention;
      var troupeNoLurkersUserHash;
      var troupeSomeLurkersUserHash;
      var troupeAllLurkersUserHash;

      beforeEach(function() {
        troupeId = mongoUtils.getNewObjectIdString() + "";
        troupeId2 = mongoUtils.getNewObjectIdString() + "";
        troupeId3 = mongoUtils.getNewObjectIdString() + "";
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
          _id: troupeId,
        };
        troupeNoLurkersUserHash = makeHash(fromUserId, false, userId1, false, userId2, false);

        troupeSomeLurkers = {
          id: troupeId2,
          _id: troupeId2,
        };
        troupeSomeLurkersUserHash = makeHash(fromUserId, false, userId1, false, userId2, true);

        troupeAllLurkers = {
          id: troupeId3,
          _id: troupeId3,
        };
        troupeAllLurkersUserHash = makeHash(fromUserId, true, userId1, true, userId2, true);

        roomMembershipService = mockito.mock(testRequire('./services/room-membership-service'));
        userService = mockito.mock(testRequire('./services/user-service'));
        appEvents = mockito.mock(testRequire('gitter-web-appevents'));
        roomPermissionsModel = mockito.mockFunction();
        categoriseUserInRoom = mockito.mockFunction();

        mockito.when(categoriseUserInRoom)().then(function(roomId, userIds) {
          /* Always return all users as online */
          return Q.resolve(userIds.reduce(function(memo, userId) {
            // TODO: test with some users inroom,push etc
            memo[userId] = 'online';
            return memo;
          }, {}));
        });

        mockito.when(roomMembershipService).findMembersForRoomWithLurk(troupeId).thenReturn(Q.resolve(troupeNoLurkersUserHash));
        mockito.when(roomMembershipService).findMembersForRoomWithLurk(troupeId2).thenReturn(Q.resolve(troupeSomeLurkersUserHash));
        mockito.when(roomMembershipService).findMembersForRoomWithLurk(troupeId3).thenReturn(Q.resolve(troupeAllLurkersUserHash));

        unreadItemService = testRequire.withProxies("./services/unread-item-service", {
          './room-membership-service': roomMembershipService,
          './user-service': userService,
          './categorise-users-in-room': categoriseUserInRoom,
          'gitter-web-appevents': appEvents,
          './room-permissions-model': roomPermissionsModel,
        });
        unreadItemService.testOnly.setSendBadgeUpdates(false);

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
            mockito.verify(appEvents).newUnreadItem(userId1, troupeId2, hasMember("chat", [chatId]));
            mockito.verify(appEvents, never()).troupeUnreadCountsChange(hasMember('userId', fromUserId));
            mockito.verify(appEvents).troupeUnreadCountsChange(deep({userId: userId1, troupeId: troupeId2, total: 1, mentions: undefined }));

            mockito.verify(appEvents).newLurkActivity(deep({ userId: userId2, troupeId: troupeId2 }));
          })
          .nodeify(done);
      });

      it('should create messages with no mentions, all lurkers', function(done) {
        unreadItemService.createChatUnreadItems(fromUserId, troupeAllLurkers, chatWithNoMentions)
          .then(function() {
            mockito.verify(appEvents, never()).newUnreadItem(anything(), anything(), anything());
            mockito.verify(appEvents, never()).troupeUnreadCountsChange(anything());

            mockito.verify(appEvents).newLurkActivity(deep({ userId: userId1, troupeId: troupeId3 }));
            mockito.verify(appEvents).newLurkActivity(deep({ userId: userId2, troupeId: troupeId3 }));

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

            mockito.verify(appEvents).newUnreadItem(userId1, troupeId3, hasMember("chat", [chatId]));
            mockito.verify(appEvents).troupeUnreadCountsChange(deep({userId: userId1, troupeId: troupeId3, total: 1, mentions: 1 }));

            mockito.verify(appEvents).newLurkActivity(deep({ userId: userId2, troupeId: troupeId3 }));
          })
          .nodeify(done);
      });

      it('should create messages with group mentions', function(done) {
        unreadItemService.createChatUnreadItems(fromUserId, troupeSomeLurkers, chatWithGroupMention)
          .then(function() {
            mockito.verify(appEvents, never()).newUnreadItem(fromUserId, anything(), anything());
            mockito.verify(appEvents).newUnreadItem(userId1, troupeId2, hasMember("chat", [chatId]));
            mockito.verify(appEvents).newUnreadItem(userId2, troupeId2, hasMember("chat", [chatId]));

            mockito.verify(appEvents, never()).troupeUnreadCountsChange(hasMember('userId', fromUserId));
            mockito.verify(appEvents).troupeUnreadCountsChange(deep({userId: userId1, troupeId: troupeId2, total: 1, mentions: 1 }));
            mockito.verify(appEvents).troupeUnreadCountsChange(deep({userId: userId2, troupeId: troupeId2, total: 1, mentions: 1  }));

          })
          .nodeify(done);
      });

      it('should create messages with duplicate mentions', function(done) {

        unreadItemService.createChatUnreadItems(fromUserId, troupeSomeLurkers, chatWithDuplicateMention)
          .then(function() {
            mockito.verify(appEvents, never()).newUnreadItem(fromUserId, anything(), anything());
            mockito.verify(appEvents).newUnreadItem(userId1, troupeId2, hasMember("chat", [chatId]));
            mockito.verify(appEvents, never()).newUnreadItem(userId2, troupeId2, anything());

            mockito.verify(appEvents, never()).troupeUnreadCountsChange(hasMember('userId', fromUserId));
            mockito.verify(appEvents).troupeUnreadCountsChange(deep({userId: userId1, troupeId: troupeId2, total: 1, mentions: 1 }));

          })
          .nodeify(done);
      });

    });

    describe('updateChatUnreadItems', function() {
      var chatId;
      var troupeId, troupeId2, troupeId3;
      var fromUserId;
      var userId1;
      var userId2;
      var userId3;
      var user3;
      var roomMembershipService;
      var appEvents;
      var userService;
      var roomPermissionsModel;
      var categoriseUserInRoom;
      var unreadItemService;
      var troupeNoLurkers;
      var troupeSomeLurkers;
      var troupeAllLurkers;
      var chatWithNoMentions;
      var chatWithSingleMention;
      var chatWithGroupMention;
      var chatWithDuplicateMention;
      var chatWithNonMemberMention;
      var troupeNoLurkersUserHash;
      var troupeSomeLurkersUserHash;
      var troupeAllLurkersUserHash;

      beforeEach(function() {
        troupeId = mongoUtils.getNewObjectIdString() + "";
        troupeId2 = mongoUtils.getNewObjectIdString() + "";
        troupeId3 = mongoUtils.getNewObjectIdString() + "";
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
          _id: troupeId,
          id: troupeId,
        };
        troupeNoLurkersUserHash = makeHash(fromUserId, false, userId1, false, userId2, false);

        troupeSomeLurkers = {
          _id: troupeId2,
          id: troupeId2,
        };
        troupeSomeLurkersUserHash = makeHash(fromUserId, false, userId1, false, userId2, true);

        troupeAllLurkers = {
          id: troupeId3,
          _id: troupeId3,
        };
        troupeAllLurkersUserHash = makeHash(fromUserId, true, userId1, true, userId2, true);

        roomMembershipService = mockito.mock(testRequire('./services/room-membership-service'));
        userService = mockito.mock(testRequire('./services/user-service'));
        appEvents = mockito.mock(testRequire('gitter-web-appevents'));
        roomPermissionsModel = mockito.mockFunction();
        categoriseUserInRoom = mockito.mockFunction();

        mockito.when(categoriseUserInRoom)().then(function(roomId, userIds) {
          /* Always return all users as online */
          return Q.resolve(userIds.reduce(function(memo, userId) {
            // TODO: test with some users inroom,push etc
            memo[userId] = 'online';
            return memo;
          }, {}));
        });

        mockito.when(roomMembershipService).findMembersForRoomWithLurk(troupeId).thenReturn(Q.resolve(troupeNoLurkersUserHash));
        mockito.when(roomMembershipService).findMembersForRoomWithLurk(troupeId2).thenReturn(Q.resolve(troupeSomeLurkersUserHash));
        mockito.when(roomMembershipService).findMembersForRoomWithLurk(troupeId3).thenReturn(Q.resolve(troupeAllLurkersUserHash));

        unreadItemService = testRequire.withProxies("./services/unread-item-service", {
          './room-membership-service': roomMembershipService,
          './user-service': userService,
          './categorise-users-in-room': categoriseUserInRoom,
          'gitter-web-appevents': appEvents,
          './room-permissions-model': roomPermissionsModel,
        });
        unreadItemService.testOnly.setSendBadgeUpdates(false);

      });

      it('should handle updates that add no mentions to a message with no mentions', function(done) {
        unreadItemService.updateChatUnreadItems(fromUserId, troupeNoLurkers, chatWithNoMentions, [])
          .then(function() {
            mockito.verify(appEvents, never()).newUnreadItem();
            mockito.verify(appEvents, never()).troupeUnreadCountsChange();
          })
          .nodeify(done);
      });

      it('should handle updates that add mentions to a message with no mentions', function(done) {
        unreadItemService.updateChatUnreadItems(fromUserId, troupeNoLurkers, chatWithSingleMention, [])
          .then(function() {
            mockito.verify(appEvents, never()).newUnreadItem(fromUserId, anything(), anything());
            mockito.verify(appEvents).newUnreadItem(userId1, troupeId, hasMember("chat", [chatId]));

            mockito.verify(appEvents, never()).troupeUnreadCountsChange(hasMember('userId', fromUserId));
            mockito.verify(appEvents).troupeUnreadCountsChange(deep({userId: userId1, troupeId: troupeId, total: 1, mentions: 1 }));
          })
          .nodeify(done);
      });

      it('should handle updates that remove mentions from a message with mentions', function(done) {
        unreadItemService.updateChatUnreadItems(fromUserId, troupeNoLurkers, chatWithNoMentions, [{ userId: userId1 }])
          .then(function() {
            mockito.verify(appEvents).newUnreadItem(userId1, troupeId, hasMember("chat", [chatId]));

          })
          .nodeify(done);
      });

      /* TODO: more tests here */

    });

  });

  describe('generateMentionDeltaSet', function() {
    var unreadItemService;

    beforeEach(function() {
      unreadItemService = testRequire("./services/unread-item-service");
      unreadItemService.testOnly.setSendBadgeUpdates(false);
    });

    it('should not return empty delta when the list of mentions is empty before and after', function() {
      var userId1 = mongoUtils.getNewObjectIdString();
      var userId2 = mongoUtils.getNewObjectIdString();

      var originalMentions = [];
      var parsedChat = {
        notifyUserIds: [userId1, userId2],
        mentionUserIds: [],
        notifyNewRoomUserIds: [],
      };

      var delta = unreadItemService.testOnly.generateMentionDeltaSet(parsedChat, originalMentions);
      assert.deepEqual(delta.addNotify, []);
      assert.deepEqual(delta.addMentions, []);
      assert.deepEqual(delta.remove, []);
      assert.deepEqual(delta.addNewRoom, []);
    });

    it('should not an empty delta when the list of mentions does not change', function() {
      var userId1 = mongoUtils.getNewObjectIdString();
      var userId2 = mongoUtils.getNewObjectIdString();
      var userId3 = mongoUtils.getNewObjectIdString();

      var originalMentions = [{ userId: userId1 }, { userIds: [userId2] }];
      var parsedChat = {
        notifyUserIds: [userId1, userId2, userId3],
        mentionUserIds: [userId1, userId2],
        notifyNewRoomUserIds: [userId1],
      };

      var delta = unreadItemService.testOnly.generateMentionDeltaSet(parsedChat, originalMentions);
      assert.deepEqual(delta.addNotify, []);
      assert.deepEqual(delta.addMentions, []);
      assert.deepEqual(delta.remove, []);
      assert.deepEqual(delta.addNewRoom, []);
    });


    it('should not an add delta when the list of mentions is empty before and has items after', function() {
      var userId1 = mongoUtils.getNewObjectIdString();
      var userId2 = mongoUtils.getNewObjectIdString();
      var userId3 = mongoUtils.getNewObjectIdString();

      var originalMentions = [];
      var parsedChat = {
        notifyUserIds: [userId1, userId2, userId3],
        mentionUserIds: [userId1, userId2],
        notifyNewRoomUserIds: [userId1],
      };

      var delta = unreadItemService.testOnly.generateMentionDeltaSet(parsedChat, originalMentions);
      assert.deepEqual(delta.addNotify, ['' + userId1, '' + userId2]);
      assert.deepEqual(delta.addMentions, ['' + userId1, '' + userId2]);
      assert.deepEqual(delta.remove, []);
      assert.deepEqual(delta.addNewRoom, ['' + userId1]);
    });

    it('should remove delta when the list of mentions was not empty before and has no items after', function() {
      var userId1 = mongoUtils.getNewObjectIdString();
      var userId2 = mongoUtils.getNewObjectIdString();
      var userId3 = mongoUtils.getNewObjectIdString();

      var originalMentions = [{ userId: userId1 }, { userIds: [userId2] }];
      var parsedChat = {
        notifyUserIds: [userId1, userId3], // userId2 is lurking
        mentionUserIds: [],
        notifyNewRoomUserIds: [],
      };

      var delta = unreadItemService.testOnly.generateMentionDeltaSet(parsedChat, originalMentions);

      assert.deepEqual(delta.addNotify, ['' + userId1]);
      assert.deepEqual(delta.addMentions, []);
      assert.deepEqual(delta.remove, ['' + userId1, '' + userId2]);
      assert.deepEqual(delta.addNewRoom, []);
    });

    it('should not notify when mentioned lurking users are removed from the mentions', function() {
      var userId1 = mongoUtils.getNewObjectIdString();
      var userId2 = mongoUtils.getNewObjectIdString();
      var userId3 = mongoUtils.getNewObjectIdString();

      var originalMentions = [{ userId: userId1 }, { userIds: [userId2] }];
      var parsedChat = {
        notifyUserIds: [userId3], // userId1, userId2 is lurking
        mentionUserIds: [],
        notifyNewRoomUserIds: [],
      };

      var delta = unreadItemService.testOnly.generateMentionDeltaSet(parsedChat, originalMentions);

      assert.deepEqual(delta.addNotify, []);
      assert.deepEqual(delta.addMentions, []);
      assert.deepEqual(delta.remove, ['' + userId1, '' + userId2]);
      assert.deepEqual(delta.addNewRoom, []);
    });

    it('should notify when mentioned non-lurking users are removed from the mentions', function() {
      var userId1 = mongoUtils.getNewObjectIdString();
      var userId2 = mongoUtils.getNewObjectIdString();

      var originalMentions = [{ userId: userId1 }, { userIds: [userId2] }];
      var parsedChat = {
        notifyUserIds: [userId1, userId2], // userId3 is lurking
        mentionUserIds: [],
        notifyNewRoomUserIds: [],
      };

      var delta = unreadItemService.testOnly.generateMentionDeltaSet(parsedChat, originalMentions);

      assert.deepEqual(delta.addNotify, ['' + userId1, '' + userId2]);
      assert.deepEqual(delta.addMentions, []);
      assert.deepEqual(delta.remove, ['' + userId1, '' + userId2]);
      assert.deepEqual(delta.addNewRoom, []);
    });

    it('should deal with adds, removes and new users all in one', function() {
      var userId1 = mongoUtils.getNewObjectIdString();
      var userId2 = mongoUtils.getNewObjectIdString();
      var userId3 = mongoUtils.getNewObjectIdString();

      var originalMentions = [{ userId: userId1 }, { userIds: [userId2] }];
      var parsedChat = {
        notifyUserIds: [userId1, userId2, userId3],
        mentionUserIds: [userId1, userId3],
        notifyNewRoomUserIds: [userId3],
      };

      var delta = unreadItemService.testOnly.generateMentionDeltaSet(parsedChat, originalMentions);

      assert.deepEqual(delta.addNotify, ['' + userId2, '' + userId3]);
      assert.deepEqual(delta.addMentions, ['' + userId3]);
      assert.deepEqual(delta.remove, ['' + userId2]);
      assert.deepEqual(delta.addNewRoom, ['' + userId3]);
    });

  });

});
