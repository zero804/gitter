/* jshint node:true, unused:true */
'use strict';

var makeBenchmark = require('../make-benchmark');
var testRequire = require('../integration/test-require');
var mockito = require('jsmockito').JsMockito;
var Promise = require('bluebird');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');

var TOTAL_USERS = 10000;

var chatId;
var troupeId;
var fromUserId;
var userIds;
var roomMembershipService;
var appEvents;
var userService;
var roomPermissionsModel;
var chatWithNoMentions;
var unreadItemService;
var troupe;
var troupeLurkersUserHash;

makeBenchmark({
  before: function() {
    troupeId = mongoUtils.getNewObjectIdString() + "";
    chatId = mongoUtils.getNewObjectIdString() + "";
    fromUserId = mongoUtils.getNewObjectIdString() + "";
    userIds = [];
    troupeLurkersUserHash = {};
    for (var i = 0; i < TOTAL_USERS; i++) {
      var id = mongoUtils.getNewObjectIdString() + "";
      userIds.push(id);
      troupeLurkersUserHash[id] = false; // Not lurking
    }

    chatWithNoMentions = {
      id: chatId,
      mentions: []
    };

    troupe = {
      id: troupeId,
      _id: troupeId,
    };

    roomMembershipService = mockito.mock(testRequire('./services/room-membership-service'));
    userService = mockito.mock(testRequire('./services/user-service'));
    appEvents = mockito.mock(testRequire('gitter-web-appevents'));
    roomPermissionsModel = mockito.mockFunction();

    mockito.when(roomMembershipService).findMembersForRoomWithLurk(troupeId).thenReturn(Promise.resolve(troupeLurkersUserHash));

    unreadItemService = testRequire.withProxies("./services/unread-items", {
      '../room-membership-service': roomMembershipService,
      '../user-service': userService,
      '../app-events': appEvents,
      'gitter-web-permissions/lib/room-permissions-model': roomPermissionsModel,
    });
    unreadItemService.testOnly.setSendBadgeUpdates(false);
  },

  after: function(done) {
    if (process.env.DISABLE_EMAIL_NOTIFY_CLEAR_AFTER_TEST) return done();

    var unreadItemServiceEngine = testRequire('./services/unread-items/engine');
    unreadItemServiceEngine.testOnly.removeAllEmailNotifications()
      .nodeify(done);
  },

  tests: {
    'createChatUnreadItems#largeRoom': function(done) {
      unreadItemService.createChatUnreadItems(fromUserId, troupe, chatWithNoMentions)
        .nodeify(done);
    }

  }

});
