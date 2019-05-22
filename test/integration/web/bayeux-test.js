'use strict';

const testRequire = require('../test-require');
const Promise = require('bluebird');
const appEvents = require('gitter-web-appevents');
const bayeuxEventsBridge = testRequire('./event-listeners/bayeux-events-bridge');
const bayeux = testRequire('./web/bayeux');
const fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
const assert = require('assert');

describe('bayeux', function() {
  describe('destroyClient', function(done) {
    it('should destroyClient', function() {
      bayeux.destroyClient('abc123', done);
    });
  });

  describe('clientExists', function() {
    it('should check client existence #slow', function(done) {
      bayeux.clientExists('abc456', function(exists) {
        assert.strictEqual(exists, false);
        done();
      });
    });
  });

  describe('auhtorisor, cluster, bayeux, bayeux-events-bridge integration', () => {
    const fixture = fixtureLoader.setup({
      user1: {},
      troupe1: { users: ['user1'], public: false },
      oAuthClient1: {},
      oAuthAccessToken1: { user: 'user1', client: 'oAuthClient1' }
    });

    /* The thread needs to be interrupted for appEvent to take place */
    const waitForAppEvent = callback =>
      new Promise(resolve =>
        setTimeout(() => {
          callback();
          resolve();
        }, 10)
      );

    it('should not send message to user who has been removed from a room', async () => {
      bayeuxEventsBridge.install();
      const client = bayeux.getClient();
      const authentication = {
        outgoing: (message, callback) => {
          if (message.channel === '/meta/handshake') {
            message.ext = { token: fixture.oAuthAccessToken1.token.toString() };
          }
          callback(message);
        }
      };
      client.addExtension(authentication);
      let messages = [];
      // waiting for the subscription to be created before going further
      await client.subscribe(
        `/api/v1/rooms/${fixture.troupe1.id}/chatMessages`,
        m => (messages = [...messages, m])
      );
      // send the first message
      appEvents.dataChange2(`/rooms/${fixture.troupe1.id}/chatMessages`, 'create', {
        text: 'hello'
      });
      await waitForAppEvent(() => {
        assert(messages.length === 1);
      });
      // remove user1 from the room
      appEvents.userRemovedFromTroupe({ userId: fixture.user1.id, troupeId: fixture.troupe1.id });
      // send the second message
      await waitForAppEvent(() => {
        appEvents.dataChange2(`/rooms/${fixture.troupe1.id}/chatMessages`, 'create', {
          text: 'hello2'
        });
      });
      // user hasn't received the message after being removed from the room
      await waitForAppEvent(() => {
        assert(messages.length === 1);
      });
    });
  });
});
