"use strict";


var testRequire = require('../test-require');
var mockito = require('jsmockito').JsMockito;

var Q = require('q');
var mongoUtils = testRequire('./utils/mongo-utils');

Q.longStackSupport = true;

var TOTAL_USERS = 10000;

/**
 * Unfortunately this has some knock on effects
 */
describe.skip('unread-item-service-large-room #slow', function() {
  // this.timeout(15000);

  var chatId;
  var troupeId;
  var fromUserId;
  var userIds;
  var troupeService;
  var appEvents;
  var userService;
  var roomPermissionsModel;
  var chatWithNoMentions;
  var unreadItemService;
  var troupe;
  var troupeLurkersUserHash;

  beforeEach(function() {
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

    troupeService = mockito.mock(testRequire('./services/troupe-service'));
    userService = mockito.mock(testRequire('./services/user-service'));
    appEvents = mockito.mock(testRequire('./app-events'));
    roomPermissionsModel = mockito.mockFunction();

    mockito.when(troupeService).findUserIdsForTroupeWithLurk(troupeId).thenReturn(Q.resolve(troupeLurkersUserHash));

    unreadItemService = testRequire.withProxies("./services/unread-item-service", {
      './troupe-service': troupeService,
      './user-service': userService,
      '../app-events': appEvents,
      './room-permissions-model': roomPermissionsModel,
    });
    unreadItemService.testOnly.setSendBadgeUpdates(false);

  });

  it('should create messages in rooms with very large mentions', function(done) {
    unreadItemService.createChatUnreadItems(fromUserId, troupe, chatWithNoMentions)
      .nodeify(done);
  });





});
