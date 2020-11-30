'use strict';

const assert = require('assert');
const fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
const mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
const MatrixEventHandler = require('../lib/matrix-event-handler');
const store = require('../lib/store');
const chatService = require('gitter-web-chats');

function createEventData(extraEventData) {
  return {
    room_id: `!${fixtureLoader.generateGithubId()}:localhost`,
    event_id: `$${fixtureLoader.generateGithubId()}:localhost`,
    sender: '@alice:localhost',
    type: 'm.room.message',
    origin_server_ts: 0,
    content: {},
    ...extraEventData
  };
}

describe('matrix-event-handler', () => {
  let matrixEventHandler;
  const matrixBridge = {
    getIntent: (/*userId*/) => ({
      getProfileInfo: () => ({
        displayname: 'Alice',
        avatar_url: 'mxc://abcedf1234'
      }),
      getClient: (/*avatarUrl*/) => ({
        mxcUrlToHttp: () => 'myavatar.png'
      })
    })
  };

  describe('onEventData', () => {
    describe('handleChatMessageEditEvent', () => {
      const fixture = fixtureLoader.setupEach({
        userBridge1: {},
        troupe1: {},
        messageFromVirtualUser1: {
          user: 'userBridge1',
          virtualUser: {
            type: 'matrix',
            externalId: 'test-person:matrix.org',
            displayName: 'Tessa'
          },
          troupe: 'troupe1',
          text: 'my original message from matrix'
        }
      });

      beforeEach(() => {
        matrixEventHandler = new MatrixEventHandler(matrixBridge, fixture.userBridge1.username);
      });

      it('When we receive message edit from Matrix, update the Gitter message in Gitter room', async () => {
        const matrixMessageEventId = `$${fixtureLoader.generateGithubId()}`;
        const eventData = createEventData({
          type: 'm.room.message',
          content: {
            body: '* my edited message from matrix',
            'm.new_content': { body: 'my edited message from matrix', msgtype: 'm.text' },
            'm.relates_to': {
              event_id: matrixMessageEventId,
              rel_type: 'm.replace'
            }
          }
        });
        await store.storeBridgedMessage(
          fixture.messageFromVirtualUser1.id,
          eventData.room_id,
          matrixMessageEventId
        );

        await matrixEventHandler.onEventData(eventData);

        const messages = await chatService.findChatMessagesForTroupe(fixture.troupe1.id);
        assert.strictEqual(messages.length, 1);
        assert.strictEqual(messages[0].text, 'my edited message from matrix');
      });

      it('Ignore message edit from Matrix when there is no matching message', async () => {
        const matrixMessageEventId = `$${fixtureLoader.generateGithubId()}`;
        const eventData = createEventData({
          type: 'm.room.message',
          content: {
            body: '* my edited message from matrix',
            'm.new_content': { body: 'my edited message from matrix', msgtype: 'm.text' },
            'm.relates_to': {
              event_id: matrixMessageEventId,
              rel_type: 'm.replace'
            }
          }
        });
        // We purposely do not associate the bridged message. We are testing that the
        // edit is ignored if there is no association in the database.
        //await store.storeBridgedMessage(fixture.messageFromVirtualUser1.id, eventData.room_id, matrixMessageEventId);

        await matrixEventHandler.onEventData(eventData);

        const messages = await chatService.findChatMessagesForTroupe(fixture.troupe1.id);
        assert.strictEqual(messages.length, 1);
        assert.strictEqual(messages[0].text, 'my original message from matrix');
      });
    });

    describe('handleChatMessageCreateEvent', () => {
      const fixture = fixtureLoader.setupEach({
        userBridge1: {},
        user1: {},
        troupe1: {},
        troupeWithThreads1: {},
        messageParent1: {
          user: 'user1',
          troupe: 'troupeWithThreads1',
          text: 'some parent message'
        },
        messageThread1: {
          parent: 'messageParent1',
          user: 'user1',
          troupe: 'troupeWithThreads1',
          text: 'some parent message'
        }
      });

      beforeEach(() => {
        matrixEventHandler = new MatrixEventHandler(matrixBridge, fixture.userBridge1.username);
      });

      it('When we receive Matrix message, creates Gitter message in Gitter room', async () => {
        const eventData = createEventData({
          type: 'm.room.message',
          content: {
            body: 'my matrix message'
          }
        });
        await store.storeBridgedRoom(fixture.troupe1.id, eventData.room_id);

        await matrixEventHandler.onEventData(eventData);

        const messages = await chatService.findChatMessagesForTroupe(fixture.troupe1.id);
        assert.strictEqual(messages.length, 1);
        assert.strictEqual(messages[0].text, 'my matrix message');
        assert.strictEqual(messages[0].virtualUser.externalId, 'alice:localhost');
        assert.strictEqual(messages[0].virtualUser.displayName, 'Alice');
      });

      it('reply to message starts threaded conversation', async () => {
        const matrixMessageEventId = `$${fixtureLoader.generateGithubId()}`;
        const eventData = createEventData({
          type: 'm.room.message',
          content: {
            body: 'my matrix reply',
            'm.relates_to': {
              'm.in_reply_to': {
                event_id: matrixMessageEventId
              }
            }
          }
        });
        await store.storeBridgedRoom(fixture.troupeWithThreads1.id, eventData.room_id);
        // Replying to a parent message
        await store.storeBridgedMessage(
          fixture.messageParent1.id,
          eventData.room_id,
          matrixMessageEventId
        );

        await matrixEventHandler.onEventData(eventData);

        const messages = await chatService.findChatMessagesForTroupe(
          fixture.troupeWithThreads1.id,
          { includeThreads: true }
        );
        assert.strictEqual(messages.length, 3);
        assert.strictEqual(messages[2].text, 'my matrix reply');
        assert(mongoUtils.isLikeObjectId(messages[2].parentId, fixture.messageParent1.id));
      });

      it("reply to message in thread that isn't the parent puts it in the thread correctly", async () => {
        const matrixMessageEventId = `$${fixtureLoader.generateGithubId()}`;
        const eventData = createEventData({
          type: 'm.room.message',
          content: {
            body: 'my matrix reply',
            'm.relates_to': {
              'm.in_reply_to': {
                event_id: matrixMessageEventId
              }
            }
          }
        });
        await store.storeBridgedRoom(fixture.troupeWithThreads1.id, eventData.room_id);
        // Replying to a message in the thread
        await store.storeBridgedMessage(
          fixture.messageThread1.id,
          eventData.room_id,
          matrixMessageEventId
        );

        await matrixEventHandler.onEventData(eventData);

        const messages = await chatService.findChatMessagesForTroupe(
          fixture.troupeWithThreads1.id,
          { includeThreads: true }
        );
        assert.strictEqual(messages.length, 3);
        assert.strictEqual(messages[2].text, 'my matrix reply');
        assert(mongoUtils.isLikeObjectId(messages[2].parentId, fixture.messageParent1.id));
      });

      it('When profile API request fails, still sends message', async () => {
        const failingMatrixBridge = {
          getIntent: (/*userId*/) => ({
            getProfileInfo: () => {
              throw new Error('Fake error and failed to fetch profile info for a user');
            }
          })
        };

        matrixEventHandler = new MatrixEventHandler(
          failingMatrixBridge,
          fixture.userBridge1.username
        );

        const eventData = createEventData({
          type: 'm.room.message',
          content: {
            body: 'my matrix message'
          }
        });
        await store.storeBridgedRoom(fixture.troupe1.id, eventData.room_id);

        await matrixEventHandler.onEventData(eventData);

        const messages = await chatService.findChatMessagesForTroupe(fixture.troupe1.id);
        assert.strictEqual(messages.length, 1);
        assert.strictEqual(messages[0].text, 'my matrix message');
        assert.strictEqual(messages[0].virtualUser.externalId, 'alice:localhost');
        assert.strictEqual(messages[0].virtualUser.displayName, 'alice');
      });

      it('mangled event does not get processed', async () => {
        const eventData = {
          // Messages should not contain state_key
          state_key: '@MadLittleMods-5f762e89986e461e663059c2:my.matrix.host',
          // No sender is present

          type: 'm.room.message',
          room_id: `!${fixtureLoader.generateGithubId()}:localhost`,
          content: {
            body: 'my matrix message'
          },
          origin_server_ts: 0
        };
        await store.storeBridgedRoom(fixture.troupe1.id, eventData.room_id);

        await matrixEventHandler.onEventData(eventData);

        const messages = await chatService.findChatMessagesForTroupe(fixture.troupe1.id);
        assert.strictEqual(messages.length, 0);
      });
    });

    describe('handleChatMessageDeleteEvent', () => {
      const fixture = fixtureLoader.setupEach({
        userBridge1: {},
        troupe1: {},
        messageFromVirtualUser1: {
          user: 'userBridge1',
          virtualUser: {
            type: 'matrix',
            externalId: 'test-person:matrix.org',
            displayName: 'Tessa'
          },
          troupe: 'troupe1',
          text: 'my original message from matrix'
        }
      });

      beforeEach(() => {
        matrixEventHandler = new MatrixEventHandler(matrixBridge, fixture.userBridge1.username);
      });

      it('When we receive Matrix message redaction/deletion, deletes Gitter message in Gitter room', async () => {
        const matrixMessageEventId = `$${fixtureLoader.generateGithubId()}`;
        const eventData = createEventData({
          type: 'm.room.redaction',
          redacts: matrixMessageEventId
        });
        await store.storeBridgedMessage(
          fixture.messageFromVirtualUser1.id,
          eventData.room_id,
          matrixMessageEventId
        );

        const messagesBefore = await chatService.findChatMessagesForTroupe(fixture.troupe1.id);
        assert.strictEqual(messagesBefore.length, 1);

        await matrixEventHandler.onEventData(eventData);

        const messagesAfter = await chatService.findChatMessagesForTroupe(fixture.troupe1.id);
        assert.strictEqual(messagesAfter.length, 0);
      });

      it('Ignore message edit from Matrix when there is no matching message', async () => {
        const matrixMessageEventId = `$${fixtureLoader.generateGithubId()}`;
        const eventData = createEventData({
          type: 'm.room.redaction',
          redacts: matrixMessageEventId
        });
        // We purposely do not associate the bridged message. We are testing that the
        // deletion is ignored if there is no association in the database.
        //await store.storeBridgedMessage(fixture.messageFromVirtualUser1.id, eventData.room_id, matrixMessageEventId);

        await matrixEventHandler.onEventData(eventData);

        const messages = await chatService.findChatMessagesForTroupe(fixture.troupe1.id);
        assert.strictEqual(messages.length, 1);
        assert.strictEqual(messages[0].text, 'my original message from matrix');
      });
    });
  });
});
