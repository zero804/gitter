"use strict";

var testRequire       = require('./../../test-require');
var fixtureLoader     = require('../../test-fixtures');
var assert            = testRequire("assert");
var Promise           = require('bluebird');
var userService       = testRequire("./services/user-service");
var chatService       = testRequire("./services/chat-service");
var unreadItemService = testRequire("./services/unread-items");
var appEvents         = testRequire("gitter-web-appevents");

describe("Ensure that non-members receive the correct notifications for mentions #slow", function() {
  var fixture = {};

  before(fixtureLoader(fixture, {
    user1: { username: true },
    user2: { username: true },
    troupe1: { users: ['user1'], githubType: 'REPO', security: 'PUBLIC' }
  }));

  after(function() {
    return fixture.cleanup();
  });

  it('should notify', function() {
    var troupe = fixture.troupe1;
    var troupeId = troupe.id;
    var user2 = fixture.user2;

    var onUserMentionedInNonMemberRoom = 0;
    appEvents.onUserMentionedInNonMemberRoom(function(data) {
      if (String(data.userId) === String(user2.id)) {
        onUserMentionedInNonMemberRoom++;
      }
    })

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


});
