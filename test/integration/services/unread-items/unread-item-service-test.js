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

var testRequire = require('../../test-require');
var mockito = require('jsmockito').JsMockito;
var hamcrest = getHamcrest();
var blockTimer = require('../../block-timer');
var Promise = require('bluebird');
var assert = require('assert');
var testGenerator = require('../../test-generator');
var MockBadgeBatcherController = require('../../utils/mock-redis-batcher');
var Distribution = testRequire('./services/unread-items/distribution');
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
    unreadItemService = testRequire("./services/unread-items");
    mongoUtils = testRequire('./utils/mongo-utils');
    unreadItemService.testOnly.setSendBadgeUpdates(false);
  });

  after(function() {
    if (process.env.DISABLE_EMAIL_NOTIFY_CLEAR_AFTER_TEST) return;

    var unreadItemServiceEngine = testRequire('./services/unread-items/engine');
    return unreadItemServiceEngine.testOnly.removeAllEmailNotifications();
  });

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
        engine = mockito.mock(testRequire('./services/unread-items/engine'));

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

        unreadItemService = testRequire.withProxies("./services/unread-items", {
          '../core/recent-room-core': recentRoomCore,
          './engine': engine
        });

      });

      it('should get activity for rooms with recent messages', function() {
        return unreadItemService.getActivityIndicatorForTroupeIds([troupeId1, troupeId2, troupeId3], userId1)
          .then(function(activity) {
            assert.deepEqual(Object.keys(activity).length, 2);
            assert.deepEqual(activity[troupeId1], true); // Message more recent than the last access
            assert.deepEqual(activity[troupeId3], false); // User visited the room after this msg
          });
      });

      it('should not return any activity if no rooms provided', function() {
        return unreadItemService.getActivityIndicatorForTroupeIds([], userId1)
          .then(function(activity) {
            assert.deepEqual(Object.keys(activity).length, 0);
          });
      });

    });

    describe('removeItem', function() {
      it('should remove an item from the unread-item-store', function() {
        var troupeId1 = mongoUtils.getNewObjectIdString();
        var chatId = mongoUtils.getNewObjectIdString();
        var userId1 = mongoUtils.getNewObjectIdString();
        var userId2 = mongoUtils.getNewObjectIdString();
        var userId3 = mongoUtils.getNewObjectIdString();

        var roomMembershipServiceMock = mockito.mock(testRequire('./services/room-membership-service'));
        var appEvents = mockito.spy(testRequire('gitter-web-appevents'));

        var unreadItemService = testRequire.withProxies("./services/unread-items", {
          '../room-membership-service': roomMembershipServiceMock,
          'gitter-web-appevents': appEvents
        });
        unreadItemService.testOnly.setSendBadgeUpdates(false);

        var usersWithLurkHash = {};
        usersWithLurkHash[userId1] = false;
        usersWithLurkHash[userId2] = false;
        usersWithLurkHash[userId3] = false;

        mockito.when(roomMembershipServiceMock).findMembersForRoomWithLurk(troupeId1).thenReturn(Promise.resolve(usersWithLurkHash));

        return unreadItemService.testOnly.removeItem(troupeId1, chatId)
          .then(function() {
            // Two calls here, not three
            mockito.verify(appEvents, once).unreadItemsRemoved(userId1, troupeId1);
            mockito.verify(appEvents, once).unreadItemsRemoved(userId2, troupeId1);
            mockito.verify(appEvents, once).unreadItemsRemoved(userId3, troupeId1);

            return unreadItemService.getBadgeCountsForUserIds([userId1, userId2, userId3]);
          })
          .then(function(result) {
            assert.equal(result[userId1], 0);
            assert.equal(result[userId2], 0);
            assert.equal(result[userId3], 0);
          });

      });
    });

    describe('createChatUnreadItems', function() {
      var chatId;
      var troupeId;
      var fromUserId;
      var userId1;
      var userId2;
      var userId3;
      var appEvents;
      var troupe;
      var chat;
      var createDistribution;
      var createDistributionResponse;

      beforeEach(function() {
        troupeId = mongoUtils.getNewObjectIdString() + "";
        chatId = mongoUtils.getNewObjectIdString() + "";
        fromUserId = mongoUtils.getNewObjectIdString() + "";
        userId1 = mongoUtils.getNewObjectIdString() + "";
        userId2 = mongoUtils.getNewObjectIdString() + "";
        userId3 = mongoUtils.getNewObjectIdString() + "";

        chat = {
          id: chatId,
          mentions: []
        };

        troupe = {
          id: troupeId,
          _id: troupeId,
        };

        appEvents = mockito.mock(testRequire('gitter-web-appevents'));
        createDistribution = mockito.mockFunction();
        createDistributionResponse = null;

        mockito.when(createDistribution)().then(function() {
          return Promise.resolve(new Distribution(createDistributionResponse));
        });

        unreadItemService = testRequire.withProxies("./services/unread-items", {
          './create-distribution': createDistribution,
          'gitter-web-appevents': appEvents,
        });
        unreadItemService.testOnly.setSendBadgeUpdates(false);

      });

      it('should create messages with no mentions, no lurkers', function() {
        createDistributionResponse = {
          notifyNoMention: [userId1, userId2],
          notifyUserIds: [userId1, userId2],
          mentionUserIds: [],
          activityOnlyUserIds: [],
          notifyNewRoomUserIds: [],
          announcement: false,
          presence: makeHash(userId1, 'online', userId2, 'online')
        };

        return unreadItemService.createChatUnreadItems(fromUserId, troupe, chat)
          .then(function() {
            mockito.verify(appEvents, never()).newUnreadItem(fromUserId, anything(), anything());
            mockito.verify(appEvents).newUnreadItem(userId1, troupeId, hasMember("chat", [chatId]));
            mockito.verify(appEvents).newUnreadItem(userId2, troupeId, hasMember("chat", [chatId]));

            mockito.verify(appEvents, never()).troupeUnreadCountsChange(hasMember('userId', fromUserId));
            mockito.verify(appEvents).troupeUnreadCountsChange(deep({userId: userId1, troupeId: troupeId, total: 1, mentions: undefined }));
            mockito.verify(appEvents).troupeUnreadCountsChange(deep({userId: userId2, troupeId: troupeId, total: 1, mentions: undefined  }));
          });
      });

      it('should create messages with no mentions, some lurkers', function() {
        createDistributionResponse = {
          notifyNoMention: [userId1],
          notifyUserIds: [userId1],
          mentionUserIds: [],
          activityOnlyUserIds: [userId2],
          notifyNewRoomUserIds: [],
          announcement: false,
          presence: makeHash(userId1, 'online', userId2, 'online')
        };

        return unreadItemService.createChatUnreadItems(fromUserId, troupe, chat)
          .then(function() {
            mockito.verify(appEvents, never()).newUnreadItem(fromUserId, anything(), anything());
            mockito.verify(appEvents).newUnreadItem(userId1, troupeId, hasMember("chat", [chatId]));
            mockito.verify(appEvents, never()).troupeUnreadCountsChange(hasMember('userId', fromUserId));
            mockito.verify(appEvents).troupeUnreadCountsChange(deep({userId: userId1, troupeId: troupeId, total: 1, mentions: undefined }));

            mockito.verify(appEvents).newLurkActivity(deep({ userId: userId2, troupeId: troupeId }));
          });
      });

      it('should create messages with no mentions, all lurkers', function() {
        createDistributionResponse = {
          notifyNoMention: [],
          notifyUserIds: [],
          mentionUserIds: [],
          activityOnlyUserIds: [userId1, userId2],
          notifyNewRoomUserIds: [],
          announcement: false,
          presence: makeHash(userId1, 'online', userId2, 'online')
        };

        return unreadItemService.createChatUnreadItems(fromUserId, troupe, chat)
          .then(function() {
            mockito.verify(appEvents, never()).newUnreadItem(anything(), anything(), anything());
            mockito.verify(appEvents, never()).troupeUnreadCountsChange(anything());

            mockito.verify(appEvents).newLurkActivity(deep({ userId: userId1, troupeId: troupeId }));
            mockito.verify(appEvents).newLurkActivity(deep({ userId: userId2, troupeId: troupeId }));
          });
      });

      it('should create messages with user mentions to non lurkers', function() {
        createDistributionResponse = {
          notifyNoMention: [userId2],
          notifyUserIds: [userId1, userId2],
          mentionUserIds: [userId1],
          activityOnlyUserIds: [],
          notifyNewRoomUserIds: [],
          announcement: false,
          presence: makeHash(userId1, 'online', userId2, 'online')
        };

        return unreadItemService.createChatUnreadItems(fromUserId, troupe, chat)
          .then(function() {
            mockito.verify(appEvents, never()).newUnreadItem(fromUserId, anything(), anything());
            mockito.verify(appEvents).newUnreadItem(userId1, troupeId, hasMember("chat", [chatId]));
            mockito.verify(appEvents).newUnreadItem(userId2, troupeId, hasMember("chat", [chatId]));

            mockito.verify(appEvents, never()).troupeUnreadCountsChange(hasMember('userId', fromUserId));
            mockito.verify(appEvents).troupeUnreadCountsChange(deep({userId: userId1, troupeId: troupeId, total: 1, mentions: 1 }));
            mockito.verify(appEvents).troupeUnreadCountsChange(deep({userId: userId2, troupeId: troupeId, total: 1  }));
          });
      });

      it('should create messages with user mentions to lurkers', function() {
        createDistributionResponse = {
          notifyNoMention: [],
          notifyUserIds: [userId1],
          mentionUserIds: [userId1],
          activityOnlyUserIds: [userId1, userId2],
          notifyNewRoomUserIds: [],
          announcement: false,
          presence: makeHash(userId1, 'online', userId2, 'online')
        };

        return unreadItemService.createChatUnreadItems(fromUserId, troupe, chat)
          .then(function() {
            mockito.verify(appEvents, never()).newUnreadItem(fromUserId, anything(), anything());

            mockito.verify(appEvents).newUnreadItem(userId1, troupeId, hasMember("chat", [chatId]));
            mockito.verify(appEvents).troupeUnreadCountsChange(deep({userId: userId1, troupeId: troupeId, total: 1, mentions: 1 }));

            mockito.verify(appEvents).newLurkActivity(deep({ userId: userId2, troupeId: troupeId }));
          });
      });

      it('should create messages with group mentions', function() {
        createDistributionResponse = {
          notifyNoMention: [],
          notifyUserIds: [userId1, userId2],
          mentionUserIds: [userId1, userId2],
          activityOnlyUserIds: [userId1, userId2],
          notifyNewRoomUserIds: [],
          announcement: true,
          presence: makeHash(userId1, 'online', userId2, 'online')
        };

        return unreadItemService.createChatUnreadItems(fromUserId, troupe, chat)
          .then(function() {
            mockito.verify(appEvents, never()).newUnreadItem(fromUserId, anything(), anything());
            mockito.verify(appEvents).newUnreadItem(userId1, troupeId, hasMember("chat", [chatId]));
            mockito.verify(appEvents).newUnreadItem(userId2, troupeId, hasMember("chat", [chatId]));

            mockito.verify(appEvents, never()).troupeUnreadCountsChange(hasMember('userId', fromUserId));
            mockito.verify(appEvents).troupeUnreadCountsChange(deep({userId: userId1, troupeId: troupeId, total: 1, mentions: 1 }));
            mockito.verify(appEvents).troupeUnreadCountsChange(deep({userId: userId2, troupeId: troupeId, total: 1, mentions: 1  }));
          });
      });

    });

    describe('updateChatUnreadItems', function() {
      var chatId;
      var troupeId;
      var fromUserId;
      var userId1;
      var userId2;
      var userId3;
      var appEvents;
      var unreadItemService;
      var troupe;
      var chat;
      var createDistribution;
      var createDistributionResponse;

      beforeEach(function() {
        troupeId = mongoUtils.getNewObjectIdString() + "";
        chatId = mongoUtils.getNewObjectIdString() + "";
        fromUserId = mongoUtils.getNewObjectIdString() + "";
        userId1 = mongoUtils.getNewObjectIdString() + "";
        userId2 = mongoUtils.getNewObjectIdString() + "";
        userId3 = mongoUtils.getNewObjectIdString() + "";

        chat = {
          id: chatId,
          mentions: []
        };

        troupe = {
          _id: troupeId,
          id: troupeId,
        };

        appEvents = mockito.mock(testRequire('gitter-web-appevents'));

        createDistribution = mockito.mockFunction();
        createDistributionResponse = null;
        mockito.when(createDistribution)().then(function() {
          return Promise.resolve(new Distribution(createDistributionResponse));
        });

        unreadItemService = testRequire.withProxies("./services/unread-items", {
          './create-distribution': createDistribution,
          'gitter-web-appevents': appEvents,
        });
        unreadItemService.testOnly.setSendBadgeUpdates(false);

      });

      it('should handle updates that add no mentions to a message with no mentions', function() {
        createDistributionResponse = {
          notifyNoMention: [userId1, userId2],
          notifyUserIds: [userId1, userId2],
          mentionUserIds: [],
          activityOnlyUserIds: [],
          notifyNewRoomUserIds: [],
          announcement: false
        };

        return unreadItemService.updateChatUnreadItems(fromUserId, troupe, chat, [])
          .then(function() {
            mockito.verify(appEvents, never()).newUnreadItem();
            mockito.verify(appEvents, never()).troupeUnreadCountsChange();
          });
      });

      it('should handle updates that add mentions to a message with no mentions', function() {
        createDistributionResponse = {
          notifyNoMention: [userId2],
          notifyUserIds: [userId1, userId2],
          mentionUserIds: [userId1],
          activityOnlyUserIds: [],
          notifyNewRoomUserIds: [],
          announcement: false,
          presence: makeHash(userId1, 'online', userId2, 'online')
        };

        return unreadItemService.updateChatUnreadItems(fromUserId, troupe, chat, [])
          .then(function() {
            mockito.verify(appEvents, never()).newUnreadItem(fromUserId, anything(), anything());
            mockito.verify(appEvents).newUnreadItem(userId1, troupeId, hasMember("chat", [chatId]));

            mockito.verify(appEvents, never()).troupeUnreadCountsChange(hasMember('userId', fromUserId));
            mockito.verify(appEvents).troupeUnreadCountsChange(deep({userId: userId1, troupeId: troupeId, total: 1, mentions: 1 }));
          });
      });

      it('should handle updates that remove mentions from a message with mentions', function() {
        createDistributionResponse = {
          notifyNoMention: [userId1, userId2],
          notifyUserIds: [userId1, userId2],
          mentionUserIds: [],
          activityOnlyUserIds: [],
          notifyNewRoomUserIds: [],
          announcement: false,
          presence: makeHash(userId1, 'online', userId2, 'online')
        };

        return unreadItemService.updateChatUnreadItems(fromUserId, troupe, chat, [{ userId: userId1 }])
          .then(function() {
            mockito.verify(appEvents).newUnreadItem(userId1, troupeId, hasMember("chat", [chatId]));
          });
      });

      /* TODO: more tests here */

    });

  });

  describe('generateMentionDeltaSet', function() {
    var unreadItemService;

    beforeEach(function() {
      unreadItemService = testRequire("./services/unread-items");
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

  describe('processResultsForNewItemWithMentions', function() {
    var unreadItemService, appEvents,
      mockRedisBatcher, processResultsForNewItemWithMentions,
      troupeId, chatId;

    var userId1 = 'USERID1';
    var mongoUtils = testRequire('./utils/mongo-utils');

    beforeEach(function() {
      mockRedisBatcher = new MockBadgeBatcherController();
      appEvents = mockito.mock(require('gitter-web-appevents'));
      troupeId = mongoUtils.getNewObjectIdString();
      chatId = mongoUtils.getNewObjectIdString();

      unreadItemService = testRequire.withProxies("./services/unread-items", {
        'gitter-web-appevents': appEvents,
        '../../utils/redis-batcher': mockRedisBatcher
      });

      processResultsForNewItemWithMentions = unreadItemService.testOnly.processResultsForNewItemWithMentions;
    });


    var FIXTURES = [{
      name: 'processResultsForNewItemWithMentions',
      meta: {
        notifyNoMention: [],
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
        expectNewOnlineNotification: [],
        expectNewPushCandidatesNoMention: [],
        expectNewPushCandidatesWithMention: [],
        expectTroupeUnreadCountsChange: [],
        expectLurkActivity: [],
        expectBadgeUpdateUserIds: []
      },
      tests: [{
        name: 'Chat, no mention, single user',
        meta: {
          notifyNoMention: [userId1],
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
          expectNewOnlineNotification: [userId1],
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
          notifyNoMention: [],
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
          expectNewOnlineNotification: [userId1],
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
          notifyNoMention: meta.notifyNoMention,
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


        var presence = parsed.notifyUserIds.concat(parsed.activityOnlyUserIds).reduce(function(memo,userId) {

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
        parsed.presence = presence;

        processResultsForNewItemWithMentions(troupeId, chatId, new Distribution(parsed), results, isEdit);

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
        if (meta.expectNewOnlineNotification.length) {
          mockito.verify(appEvents, once).newOnlineNotification(troupeId, chatId, equivalentArray(meta.expectNewOnlineNotification));
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
