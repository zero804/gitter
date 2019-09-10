/*jslint node: true, unused:true */
/*global describe:true, it: true, before:true */
'use strict';

var assert = require('assert');
var Promise = require('bluebird');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var persistence = require('gitter-web-persistence');
var ChatMessage = persistence.ChatMessage;
var ChatMessageBackup = persistence.ChatMessageBackup;
var proxyquireNoCallThru = require('proxyquire').noCallThru();
const sinon = require('sinon');
var chatService = require('../lib/chat-service');

describe('chatService', function() {
  var blockTimer = require('gitter-web-test-utils/lib/block-timer');
  before(blockTimer.on);
  after(blockTimer.off);

  var fixture = fixtureLoader.setupEach({
    user1: {},
    troupe1: { users: ['user1'] },
    troupe2: {
      users: ['user1'],
      securityDescriptor: {
        members: 'INVITE',
        admins: 'MANUAL',
        public: false
      }
    }
  });

  describe('creating message', () => {
    it('should validate room argument', async () => {
      await assert.rejects(
        chatService.newChatMessageToTroupe(null, fixture.user1, { text: 'Hello' }),
        /StatusError: Unknown room/
      );
    });
    it('should validate non empty message', async () => {
      await assert.rejects(
        chatService.newChatMessageToTroupe(fixture.troupe1, fixture.user1, { text: null }),
        /StatusError: Text is required/
      );
    });
    it('should validate that message length does not exceed 4096 characters', async () => {
      await assert.rejects(
        chatService.newChatMessageToTroupe(fixture.troupe1, fixture.user1, {
          text: 'x'.repeat(4097)
        }),
        /StatusError: Message exceeds maximum size/
      );
    });
    it('should set pub attribute based on whether the room is public', async () => {
      const publicMessage = await chatService.newChatMessageToTroupe(
        fixture.troupe1,
        fixture.user1,
        {
          text: 'x'
        }
      );
      const privateMessage = await chatService.newChatMessageToTroupe(
        fixture.troupe2,
        fixture.user1,
        {
          text: 'x'
        }
      );
      assert(publicMessage.pub, 'troupe1 is public and so should be the message');
      assert(!privateMessage.pub, 'troupe2 is not public and neither should be the message');
    });
  });

  describe('spam', () => {
    it('should not store a message from hellbanned user', async () => {
      fixture.user1.hellbanned = true;
      const message = await chatService.newChatMessageToTroupe(fixture.troupe1, fixture.user1, {
        text: 'I am spamming'
      });
      assert(message.id, 'A message model should be created and have an id assigned');
      const messages = await chatService.findChatMessagesForTroupe(fixture.troupe1.id, {
        aroundId: message.id
      });
      assert(messages.length === 0, 'Expected message not to be found');
    });

    it('should not store a spam message', async () => {
      const chatServiceDetectingSpam = proxyquireNoCallThru('../lib/chat-service', {
        'gitter-web-spam-detection/lib/chat-spam-detection': {
          detect: () => Promise.resolve(true)
        }
      });
      const message = await chatServiceDetectingSpam.newChatMessageToTroupe(
        fixture.troupe1,
        fixture.user1,
        {
          text: 'I am spamming'
        }
      );
      assert(message.id, 'A message model should be created and have an id assigned');
      const messages = await chatService.findChatMessagesForTroupe(fixture.troupe1.id, {
        aroundId: message.id
      });
      assert(messages.length === 0, 'Expected message not to be found');
    });
  });

  describe('after message got sent', () => {
    it('should set the troupe as last visited');
    it('should create unread items');
  });

  describe('updateChatMessage', function() {
    it('should update a recent chat message sent by the same user', async function() {
      const chatMessage = await chatService.newChatMessageToTroupe(fixture.troupe1, fixture.user1, {
        text: 'Hello'
      });
      assert(!chatMessage.editedAt, 'Expected editedAt to be null');

      const chatMessage2 = await chatService.updateChatMessage(
        fixture.troupe1,
        chatMessage,
        fixture.user1,
        'Goodbye'
      );
      assert(chatMessage2.text === 'Goodbye', 'Expected new text in message');
      assert(chatMessage.sent === chatMessage2.sent, 'Expected time to remain the same');
      assert(chatMessage2.editedAt, 'Expected edited at time to be populated');
      assert(
        chatMessage2.editedAt > chatMessage2.sent,
        'Expected edited at time to be after sent time'
      );
    });
  });

  describe('updateStatusMessage', function() {
    it('should update a recent `/me` status message sent by the same user ', function() {
      return chatService
        .newChatMessageToTroupe(fixture.troupe1, fixture.user1, {
          text: '@walter is happy',
          status: true
        })
        .then(function(chatMessage) {
          assert(chatMessage.text === '@walter is happy', 'Expected text to be the same');
          assert(chatMessage.status, 'Expected status to be set to true');
        });
    });
  });

  describe('Message entities', function() {
    it('should collect metadata from the message text', function() {
      return chatService
        .newChatMessageToTroupe(fixture.troupe1, fixture.user1, {
          text: 'hey @mauro check https://trou.pe'
        })
        .then(function(chatMessage) {
          assert(Array.isArray(chatMessage.urls), 'urls should be an array');
          assert(
            chatMessage.urls[0].url === 'https://trou.pe',
            'url should be a valid TwitterText url entity'
          );

          assert(Array.isArray(chatMessage.mentions), 'mentions should be an array');
          assert(
            chatMessage.mentions[0].screenName === 'mauro',
            'mention should be a valid TwitterText mention entity'
          );

          assert(chatMessage.metadataVersion !== 'undefined', 'there should be a metadataVersion');
        });
    });
  });

  describe('creating thread messages', () => {
    it('should create a message with parentId', async () => {
      const { troupe1, user1 } = fixture;
      const parent = await chatService.newChatMessageToTroupe(troupe1, user1, {
        text: 'A'
      });
      const chatMessage = await chatService.newChatMessageToTroupe(troupe1, user1, {
        text: 'I am replying to a thread',
        parentId: parent.id
      });
      assert.equal(chatMessage.parentId, parent.id);
    });

    it('should validate parentId', async () => {
      await assert.rejects(
        chatService.newChatMessageToTroupe(fixture.troupe1, fixture.user1, {
          text: 'I am replying to a thread',
          parentId: 'abc'
        }),
        /StatusError: parentId must be a valid message ID/
      );
    });

    it('should add/increment threadMessageCount on parent', async () => {
      const { troupe1, user1 } = fixture;
      const parent = await chatService.newChatMessageToTroupe(troupe1, user1, {
        text: 'A'
      });
      assert(!parent.threadMessageCount);
      await chatService.newChatMessageToTroupe(troupe1, user1, {
        text: 'B',
        parentId: parent.id
      });
      const oneChildParent = await chatService.findById(parent.id);
      assert.equal(oneChildParent.threadMessageCount, 1);
      await chatService.newChatMessageToTroupe(troupe1, user1, {
        text: 'C',
        parentId: parent.id
      });
      const twoChildParent = await chatService.findById(parent.id);
      assert.equal(twoChildParent.threadMessageCount, 2);
    });

    it('should not accept parent message from a different room', async () => {
      const { troupe1, troupe2, user1 } = fixture;
      const parent = await chatService.newChatMessageToTroupe(troupe2, user1, {
        text: 'A'
      });
      await assert.rejects(() =>
        chatService.newChatMessageToTroupe(troupe1, user1, {
          text: 'B',
          parentId: parent.id
        })
      );
    });
  });

  describe('Finding thread messages', () => {
    // This is a silly workaround for the fact that the mongo ID timestamp will
    // Have current time in it and we can't set date too far away from NOW
    // But we still need to have the sent time different to test the sort by sent
    const shiftNowBy = milliseconds => {
      const result = new Date();
      result.setMilliseconds(result.getMilliseconds() + milliseconds);
      return result;
    };
    const makeChildFixture = index => ({
      [`message${index}`]: {
        user: 'user1',
        troupe: 'troupe1',
        text: new String(index),
        parent: 'message0',
        sent: shiftNowBy(index)
      }
    });
    const chatFixture = fixtureLoader.setupEach({
      user1: {},
      troupe1: { users: ['user1'] },
      message0: { user: 'user1', troupe: 'troupe1', text: 'parent' },
      ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].reduce(
        (acc, index) => ({ ...acc, ...makeChildFixture(index) }),
        {}
      )
    });

    it('finds child messages for parent message', async () => {
      const { message0 } = chatFixture;
      const chats = await chatService.findThreadChatMessages(chatFixture.troupe1.id, message0.id);
      const expectedChildIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(
        i => chatFixture[`message${i}`].id
      );
      assert.deepEqual(chats.map(chat => chat.id), expectedChildIds);
    });

    it('does not find child messages for when parent message is not from troupe', async () => {
      const chats = await chatService.findThreadChatMessages(
        fixture.troupe2.id,
        chatFixture.message1.id
      );
      assert.deepEqual(chats, []);
    });

    it('finds child messages beforeId', async () => {
      const { message0 } = chatFixture;
      const chats = await chatService.findThreadChatMessages(chatFixture.troupe1.id, message0.id, {
        beforeId: chatFixture.message5.id
      });
      const expectedChildIds = [1, 2, 3, 4].map(i => chatFixture[`message${i}`].id);
      assert.deepEqual(chats.map(chat => chat.id), expectedChildIds);
    });

    it('finds child messages afterId', async () => {
      const { message0 } = chatFixture;
      const chats = await chatService.findThreadChatMessages(chatFixture.troupe1.id, message0.id, {
        afterId: chatFixture.message5.id
      });
      const expectedChildIds = [6, 7, 8, 9, 10].map(i => chatFixture[`message${i}`].id);
      assert.deepEqual(chats.map(chat => chat.id), expectedChildIds);
    });
  });

  describe('Finding messages #slow', () => {
    let chat1, chat2, chat3, childThreadMessage1;

    beforeEach(async () => {
      const { troupe1, user1 } = fixture;
      chat1 = await chatService.newChatMessageToTroupe(troupe1, user1, { text: 'A' });
      chat2 = await chatService.newChatMessageToTroupe(troupe1, user1, { text: 'B' });
      chat3 = await chatService.newChatMessageToTroupe(troupe1, user1, { text: 'C' });
      // validating that findMessagesForTroupe doesn't return child messages
      childThreadMessage1 = await chatService.newChatMessageToTroupe(troupe1, user1, {
        text: 'D',
        parentId: chat1.id
      });
    });

    afterEach(async () => {
      return chatService.removeAllMessagesForUserId(fixture.user1._id);
    });

    it('should find messages using aroundId', async () => {
      const chats = await chatService.findChatMessagesForTroupe(fixture.troupe1.id, {
        aroundId: chat2.id,
        limit: 4 //one before and one after, important thanks to small set of test data
      });
      assert.deepEqual(chats.map(chat => chat.id), [chat1.id, chat2.id, chat3.id]);
    });

    it('should find messages around parent if afterId belongs to a child message', async () => {
      const chats = await chatService.findChatMessagesForTroupe(fixture.troupe1.id, {
        aroundId: childThreadMessage1.id,
        limit: 2 // validating that the around logic works by eliminating chat3
      });
      assert.deepEqual(chats.map(chat => chat.id), [chat1.id, chat2.id, childThreadMessage1.id]); // adds the child message at the end
    });

    it('should find messages with skip', async () => {
      const withSkip = await chatService.findChatMessagesForTroupe(fixture.troupe1.id, {
        skip: 1,
        readPreference: 'primaryPreferred'
      });
      const withoutSkip = await chatService.findChatMessagesForTroupe(fixture.troupe1.id, {});

      assert.strictEqual(withSkip.length, 2);
      assert.strictEqual(withoutSkip.length, 3);

      var lastItemWithoutSkip = withoutSkip[withoutSkip.length - 1];
      var secondLastItemWithoutSkip = withoutSkip[withoutSkip.length - 2];

      var lastItemWithSkip = withSkip[withSkip.length - 1];
      // Last item without skip does not exist in with skip...
      assert.deepEqual(
        withSkip.filter(function(f) {
          return f.id === lastItemWithoutSkip.id;
        }),
        []
      );

      assert.strictEqual(secondLastItemWithoutSkip.id, lastItemWithSkip.id);
    });

    it('should not allow skip greater than 5000', function() {
      return assert.rejects(
        chatService.findChatMessagesForTroupe(fixture.troupe1.id, { skip: 10000 }),
        /StatusError: Skip is limited to 5000 items. Please use beforeId rather than skip. See https:\/\/developer.gitter.im/
      );
    });

    it('should find messages using beforeId', async () => {
      const chats = await chatService.findChatMessagesForTroupe(fixture.troupe1.id, {
        beforeId: chat2.id
      });
      assert.deepEqual(chats.map(chat => chat.id), [chat1.id]);
    });

    it('should find messages using beforeInclId', async () => {
      const chats = await chatService.findChatMessagesForTroupe(fixture.troupe1.id, {
        beforeInclId: chat2.id
      });
      assert.deepEqual(chats.map(chat => chat.id), [chat1.id, chat2.id]);
    });

    it('should find messages using afterId', async () => {
      const chats = await chatService.findChatMessagesForTroupe(fixture.troupe1.id, {
        afterId: chat2.id
      });
      assert.deepEqual(chats.map(chat => chat.id), [chat3.id]);
    });

    it('should find messages around unread marker', async () => {
      const unreadItemService = require('gitter-web-unread-items');
      const chatServiceWithUnreads = proxyquireNoCallThru('../lib/chat-service', {
        'gitter-web-unread-items': unreadItemService
      });
      const getFirstUnreadItemStub = sinon.stub(unreadItemService, 'getFirstUnreadItem');
      const { troupe1, user1 } = fixture;
      getFirstUnreadItemStub.withArgs(user1.id, troupe1.id).returns(Promise.resolve(chat2.id));
      const chats = await chatServiceWithUnreads.findChatMessagesForTroupe(fixture.troupe1.id, {
        marker: 'first-unread',
        userId: user1.id
      });
      assert.deepEqual(chats.map(chat => chat.id), [chat1.id, chat2.id, chat3.id]);
      getFirstUnreadItemStub.restore();
    });
  });

  describe('getRecentPublicChats #slow', function() {
    beforeEach(() => {
      fixtureLoader.disableMongoTableScans();

      return Promise.all([
        chatService.newChatMessageToTroupe(fixture.troupe1, fixture.user1, {
          text: 'm1',
          status: true
        }),
        chatService.newChatMessageToTroupe(fixture.troupe1, fixture.user1, {
          text: 'm2',
          status: true
        })
      ]);
    });

    it('finds messages', () => {
      return chatService.getRecentPublicChats().then(function(chats) {
        assert(chats.length >= 1);
      });
    });
  });

  describe('removeAllMessagesForUserId', function() {
    it('should delete all messages for user', function() {
      return Promise.all([
        chatService.newChatMessageToTroupe(fixture.troupe1, fixture.user1, {
          text: 'happy goat',
          status: true
        }),
        chatService.newChatMessageToTroupe(fixture.troupe1, fixture.user1, {
          text: 'sad goat',
          status: true
        }),

        chatService.newChatMessageToTroupe(fixture.troupe2, fixture.user1, {
          text: 'happy goat2',
          status: true
        }),
        chatService.newChatMessageToTroupe(fixture.troupe2, fixture.user1, {
          text: 'sad goat2',
          status: true
        })
      ])
        .then(chatMessages => {
          assert.strictEqual(chatMessages.length, 4);
        })
        .then(() => {
          return chatService.removeAllMessagesForUserId(fixture.user1._id);
        })
        .then(() => {
          return Promise.props({
            messages: ChatMessage.find({ fromUserId: fixture.user1._id }),
            messageBackups: ChatMessageBackup.find({ fromUserId: fixture.user1._id })
          });
        })
        .then(({ messages, messageBackups }) => {
          assert.strictEqual(messages.length, 0);
          assert.strictEqual(messageBackups.length, 4);
        });
    });
  });

  describe('removeAllMessagesForUserIdInRoomId', () => {
    it('should delete all messages for user in specific room', function() {
      return Promise.all([
        chatService.newChatMessageToTroupe(fixture.troupe1, fixture.user1, {
          text: 'happy goat',
          status: true
        }),
        chatService.newChatMessageToTroupe(fixture.troupe1, fixture.user1, {
          text: 'sad goat',
          status: true
        })
      ])
        .then(chatMessages => {
          assert.strictEqual(chatMessages.length, 2);
        })
        .then(() => {
          return chatService.removeAllMessagesForUserIdInRoomId(
            fixture.user1._id,
            fixture.troupe1._id
          );
        })
        .then(() => {
          return Promise.props({
            messages: ChatMessage.find({
              toTroupeId: fixture.troupe1._id,
              fromUserId: fixture.user1._id
            }),
            messageBackups: ChatMessageBackup.find({
              toTroupeId: fixture.troupe1._id,
              fromUserId: fixture.user1._id
            })
          });
        })
        .then(({ messages, messageBackups }) => {
          assert.strictEqual(messages.length, 0);
          assert.strictEqual(messageBackups.length, 2);
        });
    });
  });

  describe('deleteMessageFromRoom', () => {
    it('should delete message', function() {
      return chatService
        .newChatMessageToTroupe(fixture.troupe1, fixture.user1, {
          text: 'happy goat',
          status: true
        })
        .then(message => {
          return chatService.deleteMessageFromRoom(fixture.troupe1, message);
        })
        .then(() => {
          return Promise.props({
            messages: ChatMessage.find({
              toTroupeId: fixture.troupe1._id,
              fromUserId: fixture.user1._id
            }),
            messageBackups: ChatMessageBackup.find({
              toTroupeId: fixture.troupe1._id,
              fromUserId: fixture.user1._id
            })
          });
        })
        .then(({ messages, messageBackups }) => {
          assert.strictEqual(messages.length, 0);
          assert.strictEqual(messageBackups.length, 1);
        });
    });
  });
});
