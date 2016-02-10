"use strict";

// Lets get rid of hamcrest. Until we do, we'll have to do this
// its nasty, but if jsmockito uses a different instance of the library
// it won't work correctly
function getHamcrest() {
  try {
    return require('jsmockito/node_modules/jshamcrest').JsHamcrest;
  } catch(e) {
    return require('jsmockito').JsHamcrest;
  }
}

var testRequire = require('../test-require');
var mockito = require('jsmockito').JsMockito;
var hamcrest = getHamcrest();

var Promise = require('bluebird');
var assert = require('assert');

var times = mockito.Verifiers.times;
var never = mockito.Verifiers.never;
var once = times(1);

var allOf = hamcrest.Matchers.allOf;
var equalTo = hamcrest.Matchers.equalTo;
var anything = hamcrest.Matchers.anything;
var hasMember = hamcrest.Matchers.hasMember;
var hasItem = hamcrest.Matchers.hasItem;
var hasSize = hamcrest.Matchers.hasSize;

var equivalentArray = function(expected) {
  return allOf(expected.map(function(expectedItem) {
    return hasItem(expectedItem);
  }).concat(hasSize(expected.length)));
};

var equivalentMap = function(expected) {
  return allOf(Object.keys(expected).map(function(key) {
    return hasMember(key, equalTo(expected[key]));
  }));
};

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

describe('unread-item-service', function() {
  var unreadItemService, mongoUtils;

  before(function() {
    /* Don't send batches out */
    unreadItemService = testRequire("./services/unread-item-service");
    mongoUtils = testRequire('./utils/mongo-utils');
    unreadItemService.testOnly.setSendBadgeUpdates(false);
  });

  after(function(done) {
    if (process.env.DISABLE_EMAIL_NOTIFY_CLEAR_AFTER_TEST) return done();

    var unreadItemServiceEngine = testRequire('./services/unread-item-service-engine');
    unreadItemServiceEngine.testOnly.removeAllEmailNotifications()
      .nodeify(done);
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

    it('should correctly filter an array of unix timestamps given a `since` value', function() {
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

    describe('activityIndicator', function() {
      var troupeId1, troupeId2, troupeId3, troupeId4;
      var userId1;
      var unreadItemService, recentRoomCore, engine;

      beforeEach(function() {
        troupeId1 = mongoUtils.getNewObjectIdString() + "";
        troupeId2 = mongoUtils.getNewObjectIdString() + "";
        troupeId3 = mongoUtils.getNewObjectIdString() + "";
        troupeId4 = mongoUtils.getNewObjectIdString() + "";
        userId1   = mongoUtils.getNewObjectIdString() + "";

        recentRoomCore = mockito.mock(testRequire('./services/core/recent-room-core'));
        engine = mockito.mock(testRequire('./services/unread-item-service-engine'));

        // Last access times for all the rooms userId1 has visited
        var lastAccessTimes = {};
        lastAccessTimes[troupeId1] = new Date('2015-11-17T15:00:00.000Z');
        lastAccessTimes[troupeId2] = new Date('2015-11-17T16:00:00.000Z');
        lastAccessTimes[troupeId3] = new Date('2015-11-17T17:00:00.000Z');
        lastAccessTimes[troupeId4] = new Date('2015-11-17T18:00:00.000Z');

        // Last chat times only for the requested troupeIds
        var lastChatTimes = [
          '1447774200000',  // for troupeId1 => 2015-11-17T15:30:00.000Z
          null,             // for troupeId2 => no recent chats
          '1447777800000'   // for troupeId3 => 2015-11-17T16:30:00.000Z
        ];

        mockito.when(recentRoomCore).getTroupeLastAccessTimesForUser(userId1)
        .thenReturn(Promise.resolve(lastAccessTimes));

        mockito.when(engine).getLastChatTimestamps([troupeId1, troupeId2, troupeId3])
        .thenReturn(Promise.resolve(lastChatTimes));

        mockito.when(engine).getLastChatTimestamps([])
        .thenReturn(Promise.resolve({}));

        unreadItemService = testRequire.withProxies("./services/unread-item-service", {
          './core/recent-room-core': recentRoomCore,
          './unread-item-service-engine': engine
        });

      });

      it('should get activity for rooms with recent messages', function(done) {
        unreadItemService.getActivityIndicatorForTroupeIds([troupeId1, troupeId2, troupeId3], userId1)
        .then(function(activity) {
          assert.deepEqual(Object.keys(activity).length, 2);
          assert.deepEqual(activity[troupeId1], true); // Message more recent than the last access
          assert.deepEqual(activity[troupeId3], false); // User visited the room after this msg
        })
        .nodeify(done);
      });

      it('should not return any activity if no rooms provided', function(done) {
        unreadItemService.getActivityIndicatorForTroupeIds([], userId1)
        .then(function(activity) {
          assert.deepEqual(Object.keys(activity).length, 0);
        })
        .nodeify(done);
      });

    });

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

        mockito.when(roomMembershipService).findMembersForRoomWithLurk(troupeId).thenReturn(Promise.resolve(troupeNoLurkersUserHash));
        mockito.when(roomMembershipService).findMembersForRoomWithLurk(troupeId2).thenReturn(Promise.resolve(troupeSomeLurkersUserHash));
        mockito.when(roomMembershipService).findMembersForRoomWithLurk(troupeId3).thenReturn(Promise.resolve(troupeAllLurkersUserHash));

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
          .thenReturn(Promise.resolve([user3]));

        mockito.when(roomPermissionsModel)(user3, 'join', troupeSomeLurkers)
          .thenReturn(Promise.resolve(true));

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
          .thenReturn(Promise.resolve([user3]));

        mockito.when(roomPermissionsModel)(user3, 'join', troupeSomeLurkers)
          .thenReturn(Promise.resolve(false));

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
          .thenReturn(Promise.resolve([]));

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

        mockito.when(roomMembershipServiceMock).findMembersForRoomWithLurk(troupeId1).thenReturn(Promise.resolve(usersWithLurkHash));

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
          return Promise.resolve(userIds.reduce(function(memo, userId) {
            // TODO: test with some users inroom,push etc
            memo[userId] = 'online';
            return memo;
          }, {}));
        });

        mockito.when(roomMembershipService).findMembersForRoomWithLurk(troupeId).thenReturn(Promise.resolve(troupeNoLurkersUserHash));
        mockito.when(roomMembershipService).findMembersForRoomWithLurk(troupeId2).thenReturn(Promise.resolve(troupeSomeLurkersUserHash));
        mockito.when(roomMembershipService).findMembersForRoomWithLurk(troupeId3).thenReturn(Promise.resolve(troupeAllLurkersUserHash));

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
          return Promise.resolve(userIds.reduce(function(memo, userId) {
            // TODO: test with some users inroom,push etc
            memo[userId] = 'online';
            return memo;
          }, {}));
        });

        mockito.when(roomMembershipService).findMembersForRoomWithLurk(troupeId).thenReturn(Promise.resolve(troupeNoLurkersUserHash));
        mockito.when(roomMembershipService).findMembersForRoomWithLurk(troupeId2).thenReturn(Promise.resolve(troupeSomeLurkersUserHash));
        mockito.when(roomMembershipService).findMembersForRoomWithLurk(troupeId3).thenReturn(Promise.resolve(troupeAllLurkersUserHash));

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

  describe('findNonMembersWithAccess', function() {
    var userService, roomPermissionsModel, unreadItemService;

    beforeEach(function() {
      userService = mockito.mock(testRequire('./services/user-service'));
      roomPermissionsModel = mockito.mockFunction();

      unreadItemService = testRequire.withProxies("./services/unread-item-service", {
        './user-service': userService,
        './room-permissions-model': roomPermissionsModel,
      });
    });

    it('should handle an empty array', function(done) {
      unreadItemService.testOnly.findNonMembersWithAccess({ }, [])
        .then(function(userIds) {
          assert.deepEqual(userIds, []);
        })
        .nodeify(done);
    });

    it('should handle one to one rooms', function(done) {
      unreadItemService.testOnly.findNonMembersWithAccess({ oneToOne: true }, ['1','2','3'])
        .then(function(userIds) {
          assert.deepEqual(userIds, []);
        })
        .nodeify(done);
    });

    it('should handle private rooms', function(done) {
      unreadItemService.testOnly.findNonMembersWithAccess({ security: 'PRIVATE' }, ['1','2','3'])
        .then(function(userIds) {
          assert.deepEqual(userIds, []);
        })
        .nodeify(done);
    });

    it('should handle public rooms', function(done) {
      unreadItemService.testOnly.findNonMembersWithAccess({ security: 'PUBLIC' }, ['1','2','3'])
        .then(function(userIds) {
          assert.deepEqual(userIds, ['1','2','3']);
        })
        .nodeify(done);
    });

    it('should handle org and inherited rooms', function(done) {
      var troupe = {};
      mockito.when(userService).findByIds().then(function(userIds) {
        assert.deepEqual(userIds, ['1','2','3']);
        return Promise.resolve(userIds.map(function(userId) {
          return {
            _id: userId,
            id: userId
          };
        }));
      });

      mockito.when(roomPermissionsModel)().then(function(user, operation, pTroupe) {
        assert(pTroupe === troupe);
        assert.strictEqual(operation, 'join');
        return Promise.resolve(user.id !== '3');
      });

      unreadItemService.testOnly.findNonMembersWithAccess(troupe, ['1','2','3'])
        .then(function(userIds) {
          assert.deepEqual(userIds, ['1','2']); // User three should not be in the list
        })
        .nodeify(done);
    });

  });

  describe('processResultsForNewItemWithMentions', function() {
    var unreadItemService, categoriseUserInRoom, appEvents,
      mockRedisBatcher, processResultsForNewItemWithMentions,
      troupeId, chatId;

    var userId1 = 'USERID1';
    var mongoUtils = testRequire('./utils/mongo-utils');
    var testGenerator = require('../test-generator');

    beforeEach(function() {
      var MockBadgeBatcherController = require('../utils/mock-redis-batcher');
      mockRedisBatcher = new MockBadgeBatcherController();
      categoriseUserInRoom = mockito.mockFunction();
      appEvents = mockito.mock(require('gitter-web-appevents'));
      troupeId = mongoUtils.getNewObjectIdString();
      chatId = mongoUtils.getNewObjectIdString();

      unreadItemService = testRequire.withProxies("./services/unread-item-service", {
        'gitter-web-appevents': appEvents,
        '../utils/redis-batcher': mockRedisBatcher,
        './categorise-users-in-room' : categoriseUserInRoom
      });

      processResultsForNewItemWithMentions = unreadItemService.testOnly.processResultsForNewItemWithMentions;
    });


    var FIXTURES = [{
      name: 'processResultsForNewItemWithMentions',
      meta: {
        notifyUserIds: [],
        notifyNewRoomUserIds: [],
        activityOnlyUserIds: [],
        mentionUserIds: [],

        isEdit: false,

        results: [],

        inroom: [],
        online: [],
        mobile: [],
        push: [],
        push_connected: [],
        push_notified: [],
        push_notified_connected: [],

        expectUserMentionedInNonMemberRoom: [],
        expectNewUnreadNoMention: [],
        expectNewUnreadWithMention: [],
        expectNewOnlineNotificationNoMention: [],
        expectNewOnlineNotificationWithMention: [],
        expectNewPushCandidatesNoMention: [],
        expectNewPushCandidatesWithMention: [],
        expectTroupeUnreadCountsChange: [],
        expectLurkActivity: [],
        expectBadgeUpdateUserIds: []
      },
      tests: [{
        name: 'Chat, no mention, single user',
        meta: {
          notifyUserIds: [userId1],
          results: [{ userId: userId1, unreadCount: 1, mentionCount: 0, badgeUpdate: true }],
        },
        tests: [ {
          name: 'In room',
          inroom: [userId1],
          expectNewUnreadNoMention: [userId1],
          expectTroupeUnreadCountsChange: [{
            userId: userId1,
            unreadCount: 1,
            mentionCount: 0
          }],
          expectBadgeUpdateUserIds: [userId1]
        }, {
          name: 'Online',
          online: [userId1],
          expectNewUnreadNoMention: [userId1],
          expectNewOnlineNotificationNoMention: [userId1],
          expectTroupeUnreadCountsChange: [{
            userId: userId1,
            unreadCount: 1,
            mentionCount: 0
          }],
          expectBadgeUpdateUserIds: [userId1]
        }, {
          name: 'Mobile',
          mobile: [userId1],
          expectNewUnreadNoMention: [userId1],
          expectTroupeUnreadCountsChange: [{
            userId: userId1,
            unreadCount: 1,
            mentionCount: 0
          }],
          expectBadgeUpdateUserIds: [userId1]
        }, {
          name: 'Push',
          push: [userId1],

          expectBadgeUpdateUserIds: [userId1],
          expectNewPushCandidatesNoMention: [userId1]
        }, {
          name: 'Push Connected',
          push_connected: [userId1],

          expectNewUnreadNoMention: [userId1],
          expectTroupeUnreadCountsChange: [{
            userId: userId1,
            unreadCount: 1,
            mentionCount: 0
          }],

          expectBadgeUpdateUserIds: [userId1],
          expectNewPushCandidatesNoMention: [userId1]
        }, {
          name: 'Push Notified',
          push_notified: [userId1],
          expectBadgeUpdateUserIds: [userId1]
        }, {
          name: 'Push Notified Connected',
          push_notified_connected: [userId1],
          expectNewUnreadNoMention: [userId1],
          expectTroupeUnreadCountsChange: [{
            userId: userId1,
            unreadCount: 1,
            mentionCount: 0
          }],
          expectBadgeUpdateUserIds: [userId1]
        }]
      }, {
        name: 'Chat, mention, single user',
        meta: {
          notifyUserIds: [userId1],
          mentionUserIds: [userId1],
          results: [{ userId: userId1, unreadCount: 1, mentionCount: 1, badgeUpdate: true }],
        },
        tests: [{
          name: 'In room',
          inroom: [userId1],
          expectNewUnreadWithMention: [userId1],
          expectTroupeUnreadCountsChange: [{
            userId: userId1,
            unreadCount: 1,
            mentionCount: 1
          }],
          expectBadgeUpdateUserIds: [userId1]
        }, {
          name: 'Online',
          online: [userId1],
          expectNewUnreadWithMention: [userId1],
          expectNewOnlineNotificationWithMention: [userId1],
          expectTroupeUnreadCountsChange: [{
            userId: userId1,
            unreadCount: 1,
            mentionCount: 1
          }],
          expectBadgeUpdateUserIds: [userId1]
        }, {
          name: 'Mobile',
          mobile: [userId1],
          expectNewUnreadWithMention: [userId1],
          expectTroupeUnreadCountsChange: [{
            userId: userId1,
            unreadCount: 1,
            mentionCount: 1
          }],
          expectBadgeUpdateUserIds: [userId1]
        }, {
          name: 'Push',
          push: [userId1],

          expectBadgeUpdateUserIds: [userId1],
          expectNewPushCandidatesWithMention: [userId1]
        }, {
          name: 'Push Connected',
          push_connected: [userId1],

          expectNewUnreadWithMention: [userId1],
          expectTroupeUnreadCountsChange: [{
            userId: userId1,
            unreadCount: 1,
            mentionCount: 1
          }],

          expectBadgeUpdateUserIds: [userId1],
          expectNewPushCandidatesWithMention: [userId1]
        }, {
          name: 'Push Notified',
          push_notified: [userId1],
          expectNewPushCandidatesWithMention: [userId1],
          expectBadgeUpdateUserIds: [userId1]
        }, {
          name: 'Push Notified Connected',
          push_notified_connected: [userId1],
          expectNewUnreadWithMention: [userId1],
          expectNewPushCandidatesWithMention: [userId1],
          expectTroupeUnreadCountsChange: [{
            userId: userId1,
            unreadCount: 1,
            mentionCount: 1
          }],
          expectBadgeUpdateUserIds: [userId1]
        }]
      }, {
        name: 'Lurking user',
        meta: {
          activityOnlyUserIds: [userId1]
        },
        tests: [{
          name: 'In room',
          inroom: [userId1],
          expectLurkActivity: [userId1]
        }, {
          name: 'Online',
          online: [userId1],
          expectLurkActivity: [userId1]
        }, {
          name: 'Mobile',
          mobile: [userId1],
          expectLurkActivity: [userId1]
        }, {
          name: 'Push',
          push: [userId1],
        }, {
          name: 'Push Connected',
          push_connected: [userId1],
          expectLurkActivity: [userId1]
        }, {
          name: 'Push Notified',
          push_notified: [userId1],
        }, {
          name: 'Push Notified Connected',
          push_notified_connected: [userId1],
          expectLurkActivity: [userId1]
        }]
      }, {
        name: 'notifyNewRoomUserIds',
        notifyNewRoomUserIds: [userId1],
        expectUserMentionedInNonMemberRoom: [userId1]
      }]
    }];


    testGenerator(FIXTURES, function(name, meta) {
      it(name, function() {
        var parsed = {
          notifyUserIds: meta.notifyUserIds,
          notifyNewRoomUserIds: meta.notifyNewRoomUserIds,
          activityOnlyUserIds: meta.activityOnlyUserIds,
          mentionUserIds: meta.mentionUserIds,
        };

        var results = meta.results.reduce(function(memo, result) {
          memo[result.userId] = result;
          return memo;
        }, {});

        var isEdit = meta.isEdit;

        mockito.when(categoriseUserInRoom)().then(function(pTroupeId, userIds) {
          assert.strictEqual(pTroupeId, troupeId);

          var userIdsSorted = userIds.slice();
          userIdsSorted.sort();
          var expectedUserIds = parsed.notifyUserIds.concat(parsed.activityOnlyUserIds);
          expectedUserIds.sort();
          assert.deepEqual(userIdsSorted, expectedUserIds);

          var result = userIds.reduce(function(memo, userId) {

            if (meta.inroom.indexOf(userId) >= 0) {
              memo[userId] = 'inroom';
            } else if (meta.online.indexOf(userId) >= 0) {
              memo[userId] = 'online';
            } else if (meta.mobile.indexOf(userId) >= 0) {
              memo[userId] = 'mobile';
            } else if (meta.push.indexOf(userId) >= 0) {
              memo[userId] = 'push';
            } else if (meta.push_connected.indexOf(userId) >= 0) {
              memo[userId] = 'push_connected';
            } else if (meta.push_notified.indexOf(userId) >= 0) {
              memo[userId] = 'push_notified';
            } else if (meta.push_notified_connected.indexOf(userId) >= 0) {
              memo[userId] = 'push_notified_connected';
            }

            return memo;
          }, {});
          return Promise.resolve(result);
        });

        return processResultsForNewItemWithMentions(troupeId, chatId, parsed, results, isEdit)
          .then(function() {
            if (meta.expectUserMentionedInNonMemberRoom.length) {
              meta.expectUserMentionedInNonMemberRoom.forEach(function(userId) {
                mockito.verify(appEvents, once).userMentionedInNonMemberRoom(equivalentMap({ userId: userId, troupeId: troupeId }));
              });
            } else {
              mockito.verify(appEvents, never()).userMentionedInNonMemberRoom();
            }

            // newUnreadItem
            if (meta.expectNewUnreadNoMention.length || meta.expectNewUnreadWithMention.length) {
              meta.expectNewUnreadNoMention.forEach(function(userId) {
                mockito.verify(appEvents, once).newUnreadItem(userId, troupeId, equivalentMap({ chat: [chatId] }), true);
              });

              meta.expectNewUnreadWithMention.forEach(function(userId) {
                mockito.verify(appEvents, once).newUnreadItem(userId, troupeId, equivalentMap({ chat: [chatId], mention: [chatId] }), true);
              });
            } else {
              mockito.verify(appEvents, never()).newUnreadItem();
            }

            // newOnlineNotification
            if (meta.expectNewOnlineNotificationNoMention.length || meta.expectNewOnlineNotificationWithMention.length) {
              if (meta.expectNewOnlineNotificationNoMention.length) {
                mockito.verify(appEvents, once).newOnlineNotification(troupeId, chatId, equivalentArray(meta.expectNewOnlineNotificationNoMention), false);
              } else {
                mockito.verify(appEvents, never()).newOnlineNotification(anything(), anything(), anything(), false);
              }

              if (meta.expectNewOnlineNotificationWithMention.length) {
                mockito.verify(appEvents, once).newOnlineNotification(troupeId, chatId, equivalentArray(meta.expectNewOnlineNotificationWithMention), true);
              } else {
                mockito.verify(appEvents, never()).newOnlineNotification(anything(), anything(), anything(), true);
              }
            } else {
              mockito.verify(appEvents, never()).newOnlineNotification();
            }

            if (meta.expectNewPushCandidatesWithMention.length) {
              mockito.verify(appEvents, once).newPushNotificationForChat(troupeId, chatId, equivalentArray(meta.expectNewPushCandidatesWithMention), true);
            } else {
              mockito.verify(appEvents, never()).newPushNotificationForChat(anything(), anything(), anything(), true);
            }

            if (meta.expectNewPushCandidatesNoMention.length) {
              mockito.verify(appEvents, once).newPushNotificationForChat(troupeId, chatId, equivalentArray(meta.expectNewPushCandidatesNoMention), false);
            } else {
              mockito.verify(appEvents, never()).newPushNotificationForChat(anything(), anything(), anything(), false);
            }

            if (meta.expectTroupeUnreadCountsChange.length) {
              meta.expectTroupeUnreadCountsChange.forEach(function(expectTroupeUnreadCountsChange) {
                mockito.verify(appEvents, once).troupeUnreadCountsChange(equivalentMap({
                  userId: expectTroupeUnreadCountsChange.userId,
                  troupeId: troupeId,
                  total: expectTroupeUnreadCountsChange.unreadCount,
                  mentions: expectTroupeUnreadCountsChange.mentionCount
                }));
              });
            } else {
              mockito.verify(appEvents, never()).troupeUnreadCountsChange();
            }

            if (meta.expectLurkActivity.length) {
              meta.expectLurkActivity.forEach(function(userId) {
                mockito.verify(appEvents, once).newLurkActivity(equivalentMap({
                  userId: userId,
                  troupeId: troupeId
                }));
              });

            } else {
              mockito.verify(appEvents, never()).newLurkActivity();
            }

            var mockBatcher = mockRedisBatcher.getMock('badge');
            var items = mockBatcher.getItems('queue');
            assert.deepEqual(items, meta.expectBadgeUpdateUserIds);
          });
      });
    });


  });

});
