"use strict";

var testRequire = require('./../../test-require');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var assert = testRequire("assert");
var chatService = testRequire("./services/chat-service");
var unreadItemService = testRequire("./services/unread-items");
var appEvents = testRequire("gitter-web-appevents");

describe("unread item end-to-end integration tests #slow", function() {
  var fixture = {};

  before(fixtureLoader(fixture, {
    user1: { username: true },
    user2: { username: true },
    user3: { username: true },
    troupe1: { users: ['user1'], githubType: 'REPO_CHANNEL', security: 'PUBLIC' },
    troupe2: { users: ['user1'], githubType: 'ORG_CHANNEL', security: 'PRIVATE' },
  }));

  after(function() {
    return fixture.cleanup();
  });

  it('should notify when the user has access', function() {
    var troupe = fixture.troupe1;
    var troupeId = troupe.id;
    var user2 = fixture.user2;

    var onUserMentionedInNonMemberRoom = 0;
    appEvents.onUserMentionedInNonMemberRoom(function(data) {
      if (String(data.userId) === String(user2.id)) {
        onUserMentionedInNonMemberRoom++;
      }
    });

    return chatService.newChatMessageToTroupe(troupe, fixture.user1, {
        text: 'Hey there @' + user2.username
      })
      .delay(200)  // NB: magic number :(
      .bind({})
      .then(function(chat) {
        assert.strictEqual(onUserMentionedInNonMemberRoom, 1);
        this.chatId = chat.id;
        return unreadItemService.getUnreadItems(user2.id, troupeId);
      })
      .then(function(x) {
        assert.deepEqual(x, [this.chatId]);

        return unreadItemService.getRoomIdsMentioningUser(user2._id);
      })
      .then(function(roomIds) {
        assert.deepEqual(roomIds, [troupeId]);
      });
  });

  it('should not notify when the user does not have access', function() {
    var troupe = fixture.troupe2;
    var troupeId = troupe.id;
    var user3 = fixture.user3;

    var onUserMentionedInNonMemberRoom = 0;
    appEvents.onUserMentionedInNonMemberRoom(function(data) {
      if (String(data.userId) === String(user3.id)) {
        onUserMentionedInNonMemberRoom++;
      }
    });

    return chatService.newChatMessageToTroupe(troupe, fixture.user1, {
        text: 'Hey there @' + user3.username
      })
      .delay(200)  // NB: magic number :(
      .bind({})
      .then(function(chat) {
        assert.strictEqual(onUserMentionedInNonMemberRoom, 0);
        this.chatId = chat.id;
        return unreadItemService.getUnreadItems(user3.id, troupeId);
      })
      .then(function(x) {
        assert.deepEqual(x, []);

        return unreadItemService.getRoomIdsMentioningUser(user3._id);
      })
      .then(function(roomIds) {
        assert.deepEqual(roomIds, []);
      });
  });


});
