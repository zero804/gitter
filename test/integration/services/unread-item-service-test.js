"use strict";

var testRequire = require('../test-require');
var mockito = require('jsmockito').JsMockito;
var Q = require('q');
var mongoUtils = testRequire('./utils/mongo-utils');
var _ = require('underscore');
var assert = require('assert');

var times = mockito.Verifiers.times;
var once = times(1);

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

  describe('unread-item-counts', function() {
    it('should count the number of unread items and mentions a user has', function(done) {

      var troupeId = 'TROUPEID' + Date.now();
      var itemType = 'chat';
      var itemId = '51adc86e010285b469000005';
      var userId1 = 'USER1' + Date.now();
      var userId2 = 'USER2' + Date.now();

      var creatorUserId = userId2;

      var troupeServiceMock = mockito.mock(testRequire('./services/troupe-service'));
      var appEventsMock = mockito.spy(testRequire('./app-events'));

      var unreadItemService = testRequire.withProxies("./services/unread-item-service", {
        './troupe-service': troupeServiceMock,
        '../app-events': appEventsMock
      });

      var usersWithLurkHash = {};
      usersWithLurkHash[userId1] = false;

      var troupe = {
        githubType: 'REPO',
        users: usersWithLurkHash
      };

      mockito.when(troupeServiceMock).findUserIdsForTroupeWithLurk(troupeId).thenReturn(Q.resolve(troupe));

      unreadItemService.testOnly.newItem(troupeId, creatorUserId, itemType, itemId)
        .then(function() {

          return unreadItemService.getAllUnreadItemCounts(userId1, itemType)
            .then(function(items) {
              assert.equal(items.length, 1);
              assert.equal(items[0].troupeId, troupeId);
              assert.equal(items[0].unreadItems, 1);
              assert.equal(items[0].mentions, 0);
          });
        })
        .nodeify(done);
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

  describe('newItem', function() {
    it('should add a newItem to the unread-item-store', function(done) {
      var troupeId = 'TROUPEID' + Date.now();
      var itemType = 'chat';
      var itemId = '51adc86e010285b469000005';
      var userId1 = 'USER1' + Date.now();
      var userId2 = 'USER2' + Date.now();
      var userId3 = 'USER3' + Date.now();

      var creatorUserId = userId3;

      var troupeServiceMock = mockito.mock(testRequire('./services/troupe-service'));
      var appEventsMock = mockito.spy(testRequire('./app-events'));

      var unreadItemService = testRequire.withProxies("./services/unread-item-service", {
        './troupe-service': troupeServiceMock,
        '../app-events': appEventsMock
      });

      var usersWithLurkHash = {};
      usersWithLurkHash[userId1] = false;
      usersWithLurkHash[userId2] = false;
      usersWithLurkHash[userId3] = true;

      var troupe = {
        githubType: 'REPO',
        users: usersWithLurkHash
      };

      mockito.when(troupeServiceMock).findUserIdsForTroupeWithLurk(troupeId).thenReturn(Q.resolve(troupe));

      unreadItemService.testOnly.newItem(troupeId, creatorUserId, itemType, itemId)
        .then(function() {
          // Two calls here, not three
          mockito.verify(appEventsMock, once).newUnreadItem(userId1, troupeId);
          mockito.verify(appEventsMock, once).newUnreadItem(userId2, troupeId);

          return unreadItemService.getUnreadItems(userId1, troupeId, itemType)
            .then(function(items) {
              assert.equal(items.length, 1);
              assert.equal(items[0], itemId);

              return Q.delay(500).then(function() {

                return unreadItemService.getBadgeCountsForUserIds([userId1, userId2, userId3])
                  .then(function(result) {
                    assert.equal(result[userId1], 1);
                    assert.equal(result[userId2], 1);
                    assert.equal(result[userId3], 0);
                  });
              });
          });
        })
        .nodeify(done);

    });
  });


describe('removeItem', function() {
  it('should remove an item from the unread-item-store', function(done) {
    var troupeId = mongoUtils.getNewObjectIdString();
    var itemType = 'chat';
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

    unreadItemService.testOnly.removeItem(troupeId, itemType, itemId)
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

describe('markItemsRead', function() {
  it('should mark an item as read', function(done) {
    var troupeId = mongoUtils.getNewObjectIdString();
    var userId = mongoUtils.getNewObjectIdString();
    var itemType = 'chat';
    var itemId1 = mongoUtils.getNewObjectIdString();
    var itemId2 = mongoUtils.getNewObjectIdString();
    var itemId3 = mongoUtils.getNewObjectIdString();
    var items = [itemId1, itemId2];

    var troupeServiceMock = mockito.mock(testRequire('./services/troupe-service'));
    var appEventsMock = mockito.spy(testRequire('./app-events'));
    var readByService = mockito.mock(testRequire('./services/readby-service'));

    var unreadItemService = testRequire.withProxies("./services/unread-item-service", {
      './troupe-service': troupeServiceMock,
      '../app-events': appEventsMock,
      './readby-service': readByService
    });


    var usersWithLurkHash = {};
    usersWithLurkHash[userId] = false;


    var troupe = {
      githubType: 'REPO',
      users: usersWithLurkHash
    };


    mockito.when(troupeServiceMock).findUserIdsForTroupeWithLurk(troupeId).thenReturn(Q.resolve(troupe));

    return Q.all([
        unreadItemService.testOnly.newItem(troupeId, null, itemType, itemId1),
        unreadItemService.testOnly.newItem(troupeId, null, itemType, itemId2),
        unreadItemService.testOnly.newItem(troupeId, null, itemType, itemId3)
      ])
      .then(function() {

        // Need to use mocks rather than verifiers as we need to do deep equals checking onth

        mockito.when(appEventsMock).unreadItemsRemoved().then(function(a0, a1, a2) {
          assert.equal(a0, userId);
          assert.equal(a1, troupeId);
          assert.equal(a2.chat.length, 2);
          assert(a2.chat.every(function(itemId) { return _.contains(items, itemId); }));
        });

        mockito.when(readByService).recordItemsAsRead().then(function(a0, a1, a2) {
          assert.equal(a0, userId);
          assert.equal(a1, troupeId);
          assert.equal(a2.chat.length, 2);
          assert(a2.chat.every(function(itemId) { return _.contains(items, itemId); }));
        });

        unreadItemService.markItemsRead(userId, troupeId, [itemId1, itemId2])
          .then(function() {
            mockito.verify(appEventsMock).unreadItemsRemoved();
            mockito.verify(readByService).recordItemsAsRead();

            return unreadItemService.getUnreadItems(userId, troupeId, itemType)
              .then(function(items) {
                assert.equal(items.length, 1);
                assert.equal(items[0], itemId3);

                return Q.delay(500)
                  .then(function() {

                    return unreadItemService.getBadgeCountsForUserIds([userId])
                      .then(function(result) {
                        assert.equal(result[userId], 1);
                      });
                  });

              });
          });
      })
      .nodeify(done);




  });
});

describe('limits', function() {

  it('should not allow a user to have more than 100 unread items in a room', function(done) {
    var troupeId = mongoUtils.getNewObjectIdString();
    var userId = mongoUtils.getNewObjectIdString();
    var itemType = 'chat';

    var troupeServiceMock = mockito.mock(testRequire('./services/troupe-service'));

    var unreadItemService = testRequire.withProxies("./services/unread-item-service", {
      './troupe-service': troupeServiceMock
    });

    var usersWithLurkHash = {};
    usersWithLurkHash[userId] = false;


    var troupe = {
      githubType: 'REPO',
      users: usersWithLurkHash
    };

    mockito.when(troupeServiceMock).findUserIdsForTroupeWithLurk(troupeId).thenReturn(Q.resolve(troupe));
    var adds = [];

    for(var i = 0; i < 99; i++) {
      adds.push(unreadItemService.testOnly.newItem(troupeId, null, itemType, mongoUtils.getNewObjectIdString()));
    }

    blockTimer.reset();
    return Q.all(adds)
      .then(function() {
        blockTimer.reset();
        // Do a single insert sans contention. In the real world, there will never be this much
        // contention for a single usertroupe
        return unreadItemService.testOnly.newItem(troupeId, null, itemType, mongoUtils.getNewObjectIdString());
      })
      .delay(100)
      .then(function() {
        return unreadItemService.getUserUnreadCounts(userId, troupeId);
      })
      .then(function(count) {
        assert.equal(count, 100);
      })
      .nodeify(done);
  });

});

describe('mentions', function() {

  it('should record when a user is mentioned but not a member of the room', function(done) {
    var troupeId = mongoUtils.getNewObjectIdString();
    var userId = mongoUtils.getNewObjectIdString();
    var userId2 = mongoUtils.getNewObjectIdString();
    var chatId = mongoUtils.getNewObjectIdString();

    var troupeServiceMock = mockito.mock(testRequire('./services/troupe-service'));
    var appEventsMock = mockito.spy(testRequire('./app-events'));
    var userServiceMock = mockito.spy(testRequire('./services/user-service'));
    var roomPermissionsModelMock = mockito.mockFunction();

    var unreadItemService = testRequire.withProxies("./services/unread-item-service", {
      './troupe-service': troupeServiceMock,
      '../app-events': appEventsMock,
      './room-permissions-model': roomPermissionsModelMock,
      './user-service': userServiceMock
    });

    var troupe = {
      githubType: 'REPO',
      users: { /* No users */ },
      uri: 'gittertestbot/gittertestbot'
    };

    var nonMemberUserWithAccess = {
      id: userId
    };

    var nonMemberUserWithoutAccess = {
      id: userId2
    };

    // Fake chat
    var chat = {
      id: chatId,
      mentions: [{
        userId: userId
      }, {
        userId: userId2
      }]
    };

    // mockito.when(troupeServiceMock).findUserIdsForTroupeWithLurk(troupeId).thenReturn(Q.resolve(troupe));
    mockito.when(userServiceMock).findByIds().then(function(userIds) {
      assert.equal(userIds.length, 2);
      assert(_.find(userIds, function(i) { return i == userId; }));
      assert(_.find(userIds, function(i) { return i == userId2; }));

      return Q.resolve([nonMemberUserWithAccess, nonMemberUserWithoutAccess]);
    });

    var y = 0;
    mockito.when(roomPermissionsModelMock)().then(function(user, perm, _room) {
      y++;
      assert.equal(perm, 'join');
      assert.equal(_room.id, troupe.id);

      if(y > 2) {
        assert(false, 'permissions model called more than twice');
      }

      if(user !== nonMemberUserWithAccess) {
        assert.equal(user, nonMemberUserWithoutAccess);
        return Q.resolve(false);
      } else {
        return Q.resolve(true);

      }

    });

    var c = 0;
    mockito.when(appEventsMock).troupeMentionCountsChange().then(function(data) {
      assert.equal(data.userId, userId);
      assert.equal(data.troupeId, troupeId);
      c++;
      if(c === 1) {
        assert.equal(data.total, 1);
        assert.equal(data.op, 'add');
        assert.equal(data.member, false);
      } else if(c == 2) {
        assert.equal(data.total, 0);
        assert.equal(data.op, 'remove');
        assert.equal(data.member, false);
      } else {
        assert(false, 'Call ' + c);
      }
    });

    return unreadItemService.testOnly.detectAndCreateMentions(troupeId, troupe, undefined, chat)
      .then(function() {
        assert.equal(c, 1);
        assert.equal(y, 2);
        return unreadItemService.getRoomIdsMentioningUser(userId);
      })
      .then(function(troupeIds) {
        assert.equal(troupeIds.length, 1);
        assert.equal(troupeIds[0], troupeId);

        return unreadItemService.markItemsRead(userId, troupeId, undefined, [chatId], { member: false });
      })
      .then(function() {
        assert.equal(c, 2);
        return unreadItemService.getRoomIdsMentioningUser(userId);
      })
      .then(function(troupeIds) {
        assert.equal(troupeIds.length, 0);
      })
      .nodeify(done);
  });

});

describe('emailnotifications', function() {
  it('should let you know who needs to be notified by email', function(done) {
    this.timeout(10000);
    
    var troupeId = mongoUtils.getNewObjectIdString();
    var userId = mongoUtils.getNewObjectIdString();
    var itemType = 'chat';
    var itemId1 = mongoUtils.getNewObjectIdString();
    var itemId2 = mongoUtils.getNewObjectIdString();
    var itemId3 = mongoUtils.getNewObjectIdString();

    var troupeServiceMock = mockito.mock(testRequire('./services/troupe-service'));

    var unreadItemService = testRequire.withProxies("./services/unread-item-service", {
      './troupe-service': troupeServiceMock
    });

    var userHash = {
    };
    userHash[userId] = false;
    mockito.when(troupeServiceMock).findUserIdsForTroupeWithLurk(troupeId).thenReturn(Q.resolve({
      users: userHash
    }));

    return Q.all([
        unreadItemService.testOnly.newItem(troupeId, null, itemType, itemId1),
        unreadItemService.testOnly.newItem(troupeId, null, itemType, itemId2),
        unreadItemService.testOnly.newItem(troupeId, null, itemType, itemId3)
      ])
      .then(function() {
        return unreadItemService.listTroupeUsersForEmailNotifications(Date.now() + 10, 5);
      })
      .then(function(results) {
        assert(results[userId]);
        assert(results[userId][troupeId]);
        assert.equal(results[userId][troupeId].length, 3);
        assert(results[userId][troupeId].indexOf('' + itemId1) >= 0);
        assert(results[userId][troupeId].indexOf('' + itemId2) >= 0);
        assert(results[userId][troupeId].indexOf('' + itemId3) >= 0);
      })
      .nodeify(done);
  });

  it('should not find someone who has been notified', function(done) {
    var troupeId = mongoUtils.getNewObjectIdString();
    var userId = mongoUtils.getNewObjectIdString();
    var itemType = 'chat';
    var itemId1 = mongoUtils.getNewObjectIdString();
    var itemId2 = mongoUtils.getNewObjectIdString();
    var itemId3 = mongoUtils.getNewObjectIdString();

    var troupeServiceMock = mockito.mock(testRequire('./services/troupe-service'));

    var unreadItemService = testRequire.withProxies("./services/unread-item-service", {
      './troupe-service': troupeServiceMock
    });

    var userHash = {
    };
    userHash[userId] = false;
    mockito.when(troupeServiceMock).findUserIdsForTroupeWithLurk(troupeId).thenReturn(Q.resolve({
      users: userHash
    }));

    return Q.all([
        unreadItemService.testOnly.newItem(troupeId, null, itemType, itemId1),
        unreadItemService.testOnly.newItem(troupeId, null, itemType, itemId2),
        unreadItemService.testOnly.newItem(troupeId, null, itemType, itemId3)
      ])
      .then(function() {
        return unreadItemService.listTroupeUsersForEmailNotifications(Date.now(), 5);
      })
      .then(function() {
        return unreadItemService.listTroupeUsersForEmailNotifications(Date.now(), 5);
      })
      .then(function(results) {
        assert(!results[userId]);
      })
      .nodeify(done);
  });

  it('should not notify someone who has read their messages', function(done) {
    var troupeId = mongoUtils.getNewObjectIdString();
    var userId = mongoUtils.getNewObjectIdString();
    var itemType = 'chat';
    var itemId1 = mongoUtils.getNewObjectIdString();
    var itemId2 = mongoUtils.getNewObjectIdString();
    var itemId3 = mongoUtils.getNewObjectIdString();
    var items = {
      'chat': [itemId1]
    };

    var troupeServiceMock = mockito.mock(testRequire('./services/troupe-service'));

    var unreadItemService = testRequire.withProxies("./services/unread-item-service", {
      './troupe-service': troupeServiceMock
    });


    var usersWithLurkHash = {};
    usersWithLurkHash[userId] = true;

    var troupe = {
      githubType: 'REPO',
      users: usersWithLurkHash
    };

    mockito.when(troupeServiceMock).findUserIdsForTroupeWithLurk(troupeId).thenReturn(Q.resolve(troupe));

    return Q.all([
        unreadItemService.testOnly.newItem(troupeId, null, itemType, itemId1),
        unreadItemService.testOnly.newItem(troupeId, null, itemType, itemId2),
        unreadItemService.testOnly.newItem(troupeId, null, itemType, itemId3)
      ])
      .then(function() {
        unreadItemService.markItemsRead(userId, troupeId, items);
      })
      .then(function() {
        return unreadItemService.listTroupeUsersForEmailNotifications(Date.now(), 5);
      })
      .then(function(results) {
        assert(!results[userId]);
      })
      .nodeify(done);
  });


  it('should not find messages newer than the cutoff', function(done) {
    var troupeId = mongoUtils.getNewObjectIdString();
    var userId = mongoUtils.getNewObjectIdString();
    var itemType = 'chat';
    var itemId1 = mongoUtils.getNewObjectIdString();
    var itemId2 = mongoUtils.getNewObjectIdString();
    var itemId3 = mongoUtils.getNewObjectIdString();

    var troupeServiceMock = mockito.mock(testRequire('./services/troupe-service'));
    var appEventsMock = mockito.mock(testRequire('./app-events'));

    var unreadItemService = testRequire.withProxies("./services/unread-item-service", {
      './troupe-service': troupeServiceMock,
      '../app-events': appEventsMock
    });

    var usersWithLurkHash = {};
    usersWithLurkHash[userId] = false;

    var troupe = {
      users: usersWithLurkHash,
      githubType: 'REPO'
    };

    mockito.when(troupeServiceMock).findUserIdsForTroupeWithLurk(troupeId).thenReturn(Q.resolve(troupe));

    blockTimer.reset();
    return Q.all([
        unreadItemService.testOnly.newItem(troupeId, null, itemType, itemId1),
        unreadItemService.testOnly.newItem(troupeId, null, itemType, itemId2),
        unreadItemService.testOnly.newItem(troupeId, null, itemType, itemId3)
      ])
      .then(function() {
        blockTimer.reset();
        return unreadItemService.listTroupeUsersForEmailNotifications(Date.now() - 86400000, 5);
      })
      .then(function(results) {
        assert(!results[userId]);
      })
      .nodeify(done);
  });


  it('should not email somebody until the email timeout period has expired', function(done) {
    var troupeId = mongoUtils.getNewObjectIdString();
    var userId = mongoUtils.getNewObjectIdString();
    var itemType = 'chat';
    var itemId1 = mongoUtils.getNewObjectIdString();
    var itemId2 = mongoUtils.getNewObjectIdString();

    var troupeServiceMock = mockito.mock(testRequire('./services/troupe-service'));
    var appEventsMock = mockito.mock(testRequire('./app-events'));

    var unreadItemService = testRequire.withProxies("./services/unread-item-service", {
      './troupe-service': troupeServiceMock,
      '../app-events': appEventsMock
    });

    var usersWithLurkHash = {};
    usersWithLurkHash[userId] = false;

    var troupe = {
      users: usersWithLurkHash,
      githubType: 'REPO'
    };

    mockito.when(troupeServiceMock).findUserIdsForTroupeWithLurk(troupeId).thenReturn(Q.resolve(troupe));

    return unreadItemService.testOnly.newItemForUsers(troupeId, itemType, itemId1, [userId])
      .then(function() {
        return unreadItemService.listTroupeUsersForEmailNotifications(Date.now(), 1);
      })
      .then(function(results) {
        assert(results[userId]);
      })
      .then(function() {
        unreadItemService.testOnly.newItemForUsers(troupeId, itemType, itemId1, [userId]);
      })
      .then(function() {
        return unreadItemService.listTroupeUsersForEmailNotifications(Date.now(), 1);
      })
      .then(function(results) {
        assert(!results[userId]);
      })
      .then(function() {
        unreadItemService.testOnly.newItemForUsers(troupeId, itemType, itemId2, [userId]);
      })
      .delay(1100)
      .then(function() {
        return unreadItemService.listTroupeUsersForEmailNotifications(Date.now(), 1);
      })
      .then(function(results) {
        assert(results[userId]);
      })

      .nodeify(done);
  });

  it('should email somebody twice if no new messages have arrived', function(done) {
    var troupeId = mongoUtils.getNewObjectIdString();
    var userId = mongoUtils.getNewObjectIdString();
    var itemType = 'chat';
    var itemId1 = mongoUtils.getNewObjectIdString();

    var troupeServiceMock = mockito.mock(testRequire('./services/troupe-service'));
    var appEventsMock = mockito.mock(testRequire('./app-events'));

    var unreadItemService = testRequire.withProxies("./services/unread-item-service", {
      './troupe-service': troupeServiceMock,
      '../app-events': appEventsMock
    });

    var usersWithLurkHash = {};
    usersWithLurkHash[userId] = false;

    var troupe = {
      users: usersWithLurkHash,
      githubType: 'REPO'
    };

    mockito.when(troupeServiceMock).findUserIdsForTroupeWithLurk(troupeId).thenReturn(Q.resolve(troupe));

    return unreadItemService.testOnly.newItemForUsers(troupeId, itemType, itemId1, [userId])
      .then(function() {
        return unreadItemService.listTroupeUsersForEmailNotifications(Date.now(), 1);
      })
      .then(function(results) {
        assert(results[userId]);
      })
      .delay(1100)
      .then(function() {
        return unreadItemService.listTroupeUsersForEmailNotifications(Date.now(), 1);
      })
      .then(function(results) {
        assert(!results[userId]);
      })

      .nodeify(done);
  });

});

});
