"use strict";

var testRequire = require('../../test-require');
var mockito = require('jsmockito').JsMockito;
var mongoUtils = testRequire('./utils/mongo-utils');
var Promise = require('bluebird');
var assert = require('assert');
var blockTimer = require('../../block-timer');

function makeHash() {
  var hash = [];
  for(var i = 0; i < arguments.length; i = i + 2) {
    hash[arguments[i]] = arguments[i + 1];
  }
  return hash;
}

function assertIteratorDeepEqual(iterator, expected) {
  iterator.toArray().forEach(function(array) {
    assert.deepEqual(array, expected);
  });
}

describe('create-distribution', function() {
  before(blockTimer.on);
  after(blockTimer.off);

  describe('createDistribution', function() {
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
    var createDistribution;
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

      createDistribution = testRequire.withProxies("./services/unread-items/create-distribution", {
        '../room-membership-service': roomMembershipService,
        '../user-service': userService,
        '../room-permissions-model': roomPermissionsModel,
      });

    });

    it('should parse messages with no mentions, no lurkers', function() {

      return createDistribution(fromUserId, troupeNoLurkers, [])
        .then(function(result) {
          assertIteratorDeepEqual(result._notifyNoMention, [userId1, userId2]);
          assertIteratorDeepEqual(result._notifyUserIds, [userId1, userId2]);
          assertIteratorDeepEqual(result._mentionUserIds, []);
          assertIteratorDeepEqual(result._activityOnlyUserIds, []);
          assertIteratorDeepEqual(result._notifyNewRoomUserIds, []);
        });
    });

    it('should parse messages with no mentions, some lurkers', function() {
      return createDistribution(fromUserId, troupeSomeLurkers, [])
        .then(function(result) {
          assertIteratorDeepEqual(result._notifyNoMention, [userId1]);
          assertIteratorDeepEqual(result._notifyUserIds, [userId1]);
          assertIteratorDeepEqual(result._mentionUserIds, []);
          assertIteratorDeepEqual(result._activityOnlyUserIds, [userId2]);
          assertIteratorDeepEqual(result._notifyNewRoomUserIds, []);
        });
    });

    it('should parse messages with no mentions, all lurkers', function() {
      return createDistribution(fromUserId, troupeAllLurkers, [])
        .then(function(result) {
          assertIteratorDeepEqual(result._notifyNoMention, []);
          assertIteratorDeepEqual(result._notifyUserIds, []);
          assertIteratorDeepEqual(result._mentionUserIds, []);
          assertIteratorDeepEqual(result._activityOnlyUserIds, [userId1, userId2]);
          assertIteratorDeepEqual(result._notifyNewRoomUserIds, []);
        });
    });

    it('should parse messages with user mentions to non lurkers', function() {
      return createDistribution(fromUserId, troupeNoLurkers, singleMention)
        .then(function(result) {
          assertIteratorDeepEqual(result._notifyNoMention, [userId2]);
          assertIteratorDeepEqual(result._notifyUserIds, [userId1, userId2]);
          assertIteratorDeepEqual(result._mentionUserIds, [userId1]);
          assertIteratorDeepEqual(result._activityOnlyUserIds, []);
          assertIteratorDeepEqual(result._notifyNewRoomUserIds, []);
        });
    });

    it('should parse messages with user mentions to lurkers', function() {
      return createDistribution(fromUserId, troupeAllLurkers, singleMention)
        .then(function(result) {
          assertIteratorDeepEqual(result._notifyNoMention, []);
          assertIteratorDeepEqual(result._notifyUserIds, [userId1]);
          assertIteratorDeepEqual(result._mentionUserIds, [userId1]);
          assertIteratorDeepEqual(result._activityOnlyUserIds, [userId2]);
          assertIteratorDeepEqual(result._notifyNewRoomUserIds, []);
        });
    });

    it('should parse messages with group mentions', function() {
      return createDistribution(fromUserId, troupeSomeLurkers, groupMention)
        .then(function(result) {
          assertIteratorDeepEqual(result._notifyNoMention, []);
          assertIteratorDeepEqual(result._notifyUserIds, [userId1, userId2]);
          assertIteratorDeepEqual(result._mentionUserIds, [userId1, userId2]);
          assertIteratorDeepEqual(result._activityOnlyUserIds, []);
          assertIteratorDeepEqual(result._notifyNewRoomUserIds, []);
        });
    });

    it('should parse messages with duplicate mentions', function() {
      return createDistribution(fromUserId, troupeSomeLurkers, duplicateMention)
        .then(function(result) {
          assertIteratorDeepEqual(result._notifyNoMention, []);
          assertIteratorDeepEqual(result._notifyUserIds, [userId1]);
          assertIteratorDeepEqual(result._mentionUserIds, [userId1]);
          assertIteratorDeepEqual(result._activityOnlyUserIds, [userId2]);
          assertIteratorDeepEqual(result._notifyNewRoomUserIds, []);
        });
    });

    it('should parse messages with mentions to non members who are allowed in the room', function() {
      mockito.when(userService).findByIds([userId3])
        .thenReturn(Promise.resolve([user3]));

      mockito.when(roomPermissionsModel)(user3, 'join', troupeSomeLurkers)
        .thenReturn(Promise.resolve(true));

      return createDistribution(fromUserId, troupeSomeLurkers, nonMemberMention)
        .then(function(result) {
          assertIteratorDeepEqual(result._notifyUserIds, [userId1, userId3]);
          assertIteratorDeepEqual(result._mentionUserIds, [userId3]);
          assertIteratorDeepEqual(result._activityOnlyUserIds, [userId2]);
          assertIteratorDeepEqual(result._notifyNewRoomUserIds, [userId3]);
        });
    });

    it('should parse messages with mentions to non members who are not allowed in the room', function() {
      mockito.when(userService).findByIds([userId3])
        .thenReturn(Promise.resolve([user3]));

      mockito.when(roomPermissionsModel)(user3, 'join', troupeSomeLurkers)
        .thenReturn(Promise.resolve(false));

      return createDistribution(fromUserId, troupeSomeLurkers, nonMemberMention)
        .then(function(result) {
          assertIteratorDeepEqual(result._notifyUserIds, [userId1]);
          assertIteratorDeepEqual(result._mentionUserIds, []);
          assertIteratorDeepEqual(result._activityOnlyUserIds, [userId2]);
          assertIteratorDeepEqual(result._notifyNewRoomUserIds, []);
        });
    });

    it('should parse messages with mentions to non members who are not on gitter', function() {
      mockito.when(userService).findByIds([userId3])
        .thenReturn(Promise.resolve([]));

      return createDistribution(fromUserId, troupeSomeLurkers, nonMemberMention)
        .then(function(result) {
          assertIteratorDeepEqual(result._notifyUserIds, [userId1]);
          assertIteratorDeepEqual(result._mentionUserIds, []);
          assertIteratorDeepEqual(result._activityOnlyUserIds, [userId2]);
          assertIteratorDeepEqual(result._notifyNewRoomUserIds, []);
        });
    });

  });


  describe('findNonMembersWithAccess', function() {
    var userService, roomPermissionsModel, createDistribution;

    beforeEach(function() {
      userService = mockito.mock(testRequire('./services/user-service'));
      roomPermissionsModel = mockito.mockFunction();

      createDistribution = testRequire.withProxies("./services/unread-items/create-distribution", {
        '../user-service': userService,
        '../room-permissions-model': roomPermissionsModel,
      });
    });

    it('should handle an empty array', function() {
      return createDistribution.testOnly.findNonMembersWithAccess({ }, [])
        .then(function(userIds) {
          assert.deepEqual(userIds, []);
        });
    });

    it('should handle one to one rooms', function() {
      return createDistribution.testOnly.findNonMembersWithAccess({ oneToOne: true }, ['1','2','3'])
        .then(function(userIds) {
          assert.deepEqual(userIds, []);
        });
    });

    it('should handle private rooms', function() {
      return createDistribution.testOnly.findNonMembersWithAccess({ security: 'PRIVATE' }, ['1','2','3'])
        .then(function(userIds) {
          assert.deepEqual(userIds, []);
        });
    });

    it('should handle public rooms', function() {
      return createDistribution.testOnly.findNonMembersWithAccess({ security: 'PUBLIC' }, ['1','2','3'])
        .then(function(userIds) {
          assert.deepEqual(userIds, ['1','2','3']);
        });
    });

    it('should handle org and inherited rooms', function() {
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

      return createDistribution.testOnly.findNonMembersWithAccess(troupe, ['1','2','3'])
        .then(function(userIds) {
          assert.deepEqual(userIds, ['1','2']); // User three should not be in the list
        });
    });

  });
});
