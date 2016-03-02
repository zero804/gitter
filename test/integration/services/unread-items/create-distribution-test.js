"use strict";

var testRequire = require('../../test-require');
var mockito = require('jsmockito').JsMockito;
var mongoUtils = testRequire('./utils/mongo-utils');
var Promise = require('bluebird');
var assert = require('assert');
var blockTimer = require('../../block-timer');

describe('create-distribution', function() {
  before(blockTimer.on);
  after(blockTimer.off);

  describe('createDistribution', function() {
    var chatId;
    var troupeId;
    var fromUserId;
    var userId1;
    var userId2;
    var userId3;
    var user3;
    var roomMembershipService;
    var userService;
    var roomPermissionsModel;
    var createDistribution;
    var troupe;
    var troupeNotifyArray;
    var MockDistribution;
    var categoriseUserInRoom;

    beforeEach(function() {
      troupeId = mongoUtils.getNewObjectIdString() + "";
      chatId = mongoUtils.getNewObjectIdString() + "";
      fromUserId = mongoUtils.getNewObjectIdString() + "";
      userId1 = mongoUtils.getNewObjectIdString() + "";
      userId2 = mongoUtils.getNewObjectIdString() + "";
      userId3 = mongoUtils.getNewObjectIdString() + "";
      user3 = { id: userId3 };

      troupe = {
        id: troupeId,
        _id: troupeId,
      };
      troupeNotifyArray = [{ userId: userId1, flags: 1 }, { userId: userId2, flags: 2 }];

      roomMembershipService = mockito.mock(testRequire('./services/room-membership-service'));
      userService = mockito.mock(testRequire('./services/user-service'));
      roomPermissionsModel = mockito.mockFunction();

      MockDistribution = function(options) {
        this.options = options;
      }

      mockito.when(roomMembershipService).findMembersForRoomForNotify(troupeId).thenReturn(Promise.resolve(troupeNotifyArray));

      categoriseUserInRoom = function(troupeId, userIds) {
        return Promise.resolve({ troupeId: troupeId, userIds: userIds });
      };

      createDistribution = testRequire.withProxies("./services/unread-items/create-distribution", {
        '../room-membership-service': roomMembershipService,
        '../user-service': userService,
        './distribution': MockDistribution,
        '../room-permissions-model': roomPermissionsModel,
        '../categorise-users-in-room': categoriseUserInRoom
      });

    });

    it('should create a distribution with no mentions', function() {
      return createDistribution(fromUserId, troupe, [])
        .then(function(result) {
          assert.deepEqual(result.options, {
            announcement: false,
            membersWithFlags: [{
              flags: 1,
              userId: userId1
            }, {
              flags: 2,
              userId: userId2
            }],
            presence: {
              troupeId: troupeId,
              userIds: [userId1, userId2]
            }
          });
        });
    });

    it('should create a distribution with single user mentions', function() {
      return createDistribution(fromUserId, troupe, [{ userId: userId1 }])
        .then(function(result) {
          assert.deepEqual(result.options, {
            announcement: false,
            membersWithFlags: [{
              flags: 1,
              userId: userId1
            }, {
              flags: 2,
              userId: userId2
            }],
            mentions: [userId1],
            nonMemberMentions: [],
            presence: {
              troupeId: troupeId,
              userIds: [userId1, userId2]
            }
          });
        });
    });

    it('should create a distribution with a single group mention', function() {
      return createDistribution(fromUserId, troupe, [{ group: true, userIds: [userId1, userId2] }])
        .then(function(result) {
          assert.deepEqual(result.options, {
            announcement: false,
            membersWithFlags: [{
              flags: 1,
              userId: userId1
            }, {
              flags: 2,
              userId: userId2
            }],
            mentions: [userId1, userId2],
            nonMemberMentions: [],
            presence: {
              troupeId: troupeId,
              userIds: [userId1, userId2]
            }
          });
        });
    });

    it('should create a distribution with a single announcement mention', function() {
      return createDistribution(fromUserId, troupe, [{ group: true, announcement: true }])
        .then(function(result) {
          assert.deepEqual(result.options, {
            announcement: true,
            membersWithFlags: [{
              flags: 1,
              userId: userId1
            }, {
              flags: 2,
              userId: userId2
            }],
            presence: {
              troupeId: troupeId,
              userIds: [userId1, userId2]
            }
          });
        });
    });

    it('should create a distribution with an announcement and a mention', function() {
      return createDistribution(fromUserId, troupe, [{ group: true, announcement: true }, { userId: userId1 }])
        .then(function(result) {
          assert.deepEqual(result.options, {
            announcement: true,
            membersWithFlags: [{
              flags: 1,
              userId: userId1
            }, {
              flags: 2,
              userId: userId2
            }],
            mentions: [userId1],
            nonMemberMentions: [],
            presence: {
              troupeId: troupeId,
              userIds: [userId1, userId2]
            }
          });
        });
    });

    it('should create a distribution with mentions to non members who are allowed in the room', function() {
      mockito.when(userService).findByIds([userId3])
        .thenReturn(Promise.resolve([user3]));

      mockito.when(roomPermissionsModel)(user3, 'join', troupe)
        .thenReturn(Promise.resolve(true));

      return createDistribution(fromUserId, troupe, [{ userId: userId3 }])
        .then(function(result) {
          assert.deepEqual(result.options, {
            announcement: false,
            membersWithFlags: [{
              flags: 1,
              userId: userId1
            }, {
              flags: 2,
              userId: userId2
            },{
              flags: null,
              userId: userId3
            }],
            mentions: [userId3],
            nonMemberMentions: [userId3],
            presence: {
              troupeId: troupeId,
              userIds: [userId1, userId2, userId3]
            }
          });
        });
    });

    it('should create a distribution with mentions to non members who are not allowed in the room', function() {
      mockito.when(userService).findByIds([userId3])
        .thenReturn(Promise.resolve([user3]));

      mockito.when(roomPermissionsModel)(user3, 'join', troupe)
        .thenReturn(Promise.resolve(false));

      return createDistribution(fromUserId, troupe, [{ userId: userId3 }])
        .then(function(result) {
          assert.deepEqual(result.options, {
            announcement: false,
            membersWithFlags: [{
              flags: 1,
              userId: userId1
            }, {
              flags: 2,
              userId: userId2
            }],
            mentions: [],
            nonMemberMentions: [],
            presence: {
              troupeId: troupeId,
              userIds: [userId1, userId2]
            }
          });
        });
    });

    it('should create a distribution with mentions to non members who are not allowed on gitter', function() {
      mockito.when(userService).findByIds([userId3])
        .thenReturn(Promise.resolve([]));

      return createDistribution(fromUserId, troupe, [{ userId: userId3 }])
        .then(function(result) {
          assert.deepEqual(result.options, {
            announcement: false,
            membersWithFlags: [{
              flags: 1,
              userId: userId1
            }, {
              flags: 2,
              userId: userId2
            }],
            mentions: [],
            nonMemberMentions: [],
            presence: {
              troupeId: troupeId,
              userIds: [userId1, userId2]
            }
          });
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
