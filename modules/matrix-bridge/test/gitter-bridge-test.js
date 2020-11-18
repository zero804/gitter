'use strict';

const assert = require('assert');
const sinon = require('sinon');
const fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
const restSerializer = require('../../../server/serializers/rest-serializer');
const GitterBridge = require('../lib/gitter-bridge');

describe('gitter-bridge', () => {
  const fixture = fixtureLoader.setupEach({
    user1: {},
    userBridge1: {},
    troupe1: {},
    message1: {
      user: 'user1',
      troupe: 'troupe1',
      text: 'my gitter message'
    },
    message2: {
      user: 'user1',
      troupe: 'troupe1',
      text: 'my gitter message2'
    },
    messageFromVirtualUser1: {
      user: 'userBridge1',
      virtualUser: {
        type: 'matrix',
        externalId: 'test-person:matrix.org',
        displayName: 'Tessa'
      },
      troupe: 'troupe1',
      text: 'my virtualUser message'
    }
  });

  let gitterBridge;
  let matrixBridge;
  beforeEach(() => {
    const intentSpies = {
      sendMessage: sinon.spy(() => ({
        event_id: `$${fixtureLoader.generateGithubId()}:localhost`
      })),
      createRoom: sinon.spy(() => ({
        room_id: `!${fixtureLoader.generateGithubId()}:localhost`
      })),
      setDisplayName: sinon.spy(),
      uploadContent: sinon.spy(),
      setAvatarUrl: sinon.spy()
    };

    matrixBridge = {
      getIntent: (/*userId*/) => intentSpies
    };

    gitterBridge = new GitterBridge(matrixBridge);
  });

  describe('onDataChange', () => {
    it('new message gets sent off to Matrix', async () => {
      const strategy = new restSerializer.ChatStrategy();
      const serializedMessage = await restSerializer.serializeObject(fixture.message1, strategy);

      await gitterBridge.onDataChange({
        url: `/rooms/${fixture.troupe1.id}/chatMessages`,
        operation: 'create',
        model: serializedMessage
      });

      // Room is created for something that hasn't been bridged before
      assert.strictEqual(matrixBridge.getIntent().createRoom.callCount, 1);

      // Message is sent to the new room
      assert.strictEqual(matrixBridge.getIntent().sendMessage.callCount, 1);
      assert(
        matrixBridge.getIntent().sendMessage.calledWith(
          sinon.match.any,
          sinon.match({
            body: fixture.message1.text,
            format: 'org.matrix.custom.html',
            formatted_body: fixture.message1.html,
            msgtype: 'm.text'
          })
        )
      );
    });

    it('subsequent multiple messages go to the same room', async () => {
      const strategy = new restSerializer.ChatStrategy();
      const serializedMessage1 = await restSerializer.serializeObject(fixture.message1, strategy);
      const serializedMessage2 = await restSerializer.serializeObject(fixture.message2, strategy);

      await gitterBridge.onDataChange({
        url: `/rooms/${fixture.troupe1.id}/chatMessages`,
        operation: 'create',
        model: serializedMessage1
      });

      await gitterBridge.onDataChange({
        url: `/rooms/${fixture.troupe1.id}/chatMessages`,
        operation: 'create',
        model: serializedMessage2
      });

      // Room is only created once
      assert.strictEqual(matrixBridge.getIntent().createRoom.callCount, 1);

      // Messages are sent to the new room
      assert.strictEqual(matrixBridge.getIntent().sendMessage.callCount, 2);

      const sendMessageCall1 = matrixBridge.getIntent().sendMessage.getCall(0);
      const sendMessageCall2 = matrixBridge.getIntent().sendMessage.getCall(1);
      // Make sure the messages were sent to the same room
      assert.strictEqual(sendMessageCall1.args[0], sendMessageCall2.args[0]);
    });

    it('new message from virtualUser is suppressed (no echo back and forth)', async () => {
      const strategy = new restSerializer.ChatStrategy();
      const serializedVirtualUserMessage = await restSerializer.serializeObject(
        fixture.messageFromVirtualUser1,
        strategy
      );

      await gitterBridge.onDataChange({
        url: `/rooms/${fixture.troupe1.id}/chatMessages`,
        operation: 'create',
        model: serializedVirtualUserMessage
      });

      // No room creation
      assert.strictEqual(matrixBridge.getIntent().createRoom.callCount, 0);
      // No message sent
      assert.strictEqual(matrixBridge.getIntent().sendMessage.callCount, 0);
    });
  });
});