'use strict';

const assert = require('assert');
const fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
const MatrixEventHandler = require('../lib/matrix-event-handler');
const store = require('../lib/store');
const chatService = require('gitter-web-chats');

function createEventData(extraEventData) {
  return {
    room_id: `!${fixtureLoader.generateGithubId()}:localhost`,
    event_id: '$12345:localhost',
    sender: '@alice:localhost',
    type: 'm.room.message',
    origin_server_ts: 0,
    content: {},
    ...extraEventData
  };
}

describe('matrix-event-handler', () => {
  const fixture = fixtureLoader.setupEach({
    userBridge1: {},
    troupe1: {}
  });

  let matrixEventHandler;
  beforeEach(() => {
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

    matrixEventHandler = new MatrixEventHandler(matrixBridge, fixture.userBridge1.username);
  });

  describe('onEventData', () => {
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
});
