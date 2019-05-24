'use strict';

const testRequire = require('../test-require');
const Promise = require('bluebird');
const appEvents = require('gitter-web-appevents');
const bayeuxEventsBridge = testRequire('./event-listeners/bayeux-events-bridge');
const bayeux = testRequire('./web/bayeux');
const fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
const assert = require('assert');
const http = require('http');
const Faye = require('faye');

describe('bayeux', function() {
  describe('destroyClient', function(done) {
    it('should destroyClient', function() {
      bayeux.destroyClient('abc123', done);
    });
  });

  describe('publish', function() {
    xit('should publish');
  });

  describe('clientExists', function() {
    it('should check client existence #slow', function(done) {
      bayeux.clientExists('abc456', function(exists) {
        assert.strictEqual(exists, false);
        done();
      });
    });
  });

  describe('authorisor, cluster, bayeux, bayeux-events-bridge integration', () => {
    const fixture = fixtureLoader.setup({
      userToBeBanned1: {},
      userToStay1: {},
      troupe1: { users: ['userToBeBanned1', 'userToStay1'], public: false },
      oAuthClient1: {},
      oAuthAccessToken1: { user: 'userToBeBanned1', client: 'oAuthClient1' },
      oAuthAccessToken2: { user: 'userToStay1', client: 'oAuthClient1' }
    });

    /* The thread needs to be interrupted for appEvent to take place */
    const waitForAppEvent = callback =>
      new Promise(resolve =>
        setTimeout(() => {
          callback();
          resolve();
        }, 50)
      );

    const createAuthenticator = token => ({
      outgoing: (message, callback) => {
        if (message.channel === '/meta/handshake') {
          message.ext = { token: token.toString() };
        }
        callback(message);
      }
    });

    it('should not send message to user who has been removed from a room', async () => {
      bayeuxEventsBridge.install();

      var server = http.createServer();
      bayeux.attach(server);
      await server.listen(5006);

      const clientToBeBanned = new Faye.Client(`http://localhost:5006/bayeux`);
      const clientToStay = new Faye.Client(`http://localhost:5006/bayeux`);
      clientToBeBanned.addExtension(createAuthenticator(fixture.oAuthAccessToken1.token));
      clientToStay.addExtension(createAuthenticator(fixture.oAuthAccessToken2.token));

      let messagesToBeBanned = [];
      let messagesToStay = [];
      // waiting for the subscription to be created before going further
      await clientToBeBanned.subscribe(
        `/api/v1/rooms/${fixture.troupe1.id}/chatMessages`,
        m => (messagesToBeBanned = [...messagesToBeBanned, m])
      );
      await clientToStay.subscribe(
        `/api/v1/rooms/${fixture.troupe1.id}/chatMessages`,
        m => (messagesToStay = [...messagesToStay, m])
      );
      // send the first message
      appEvents.dataChange2(`/rooms/${fixture.troupe1.id}/chatMessages`, 'create', {
        text: 'hello'
      });
      await waitForAppEvent(() => {
        assert.equal(messagesToBeBanned.length, 1);
        assert.equal(messagesToStay.length, 1);
      });
      // ban userToBeBanned1 (clientToBeBanned)
      appEvents.userRemovedFromTroupe({
        userId: fixture.userToBeBanned1.id,
        troupeId: fixture.troupe1.id
      });
      // send the second message
      await waitForAppEvent(() => {
        appEvents.dataChange2(`/rooms/${fixture.troupe1.id}/chatMessages`, 'create', {
          text: 'hello2'
        });
      });
      // clientToBeBanned hasn't received the message after being removed from the room
      await waitForAppEvent(() => {
        assert.equal(messagesToBeBanned.length, 1);
        assert.equal(messagesToStay.length, 2);
      });
    });
  });
});
