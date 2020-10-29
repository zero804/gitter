'use strict';

const path = require('path');
const fs = require('fs-extra');
const { Bridge, Logging, AppServiceRegistration } = require('matrix-appservice-bridge');
const env = require('gitter-web-env');
const config = env.config;
const logger = env.logger;
const stats = env.stats;

const MatrixEventHandler = require('./matrix-event-handler');

// Stop the "Attempt to write logs with no transports" messages
// see https://github.com/matrix-org/matrix-appservice-bridge/issues/243
Logging.configure({ level: 'silent' });

const homeserverUrl = config.get('matrix:bridge:homeserverUrl');
const serverName = config.get('matrix:bridge:serverName');
const bridgeUrl = config.get('matrix:bridge:applicationServiceUrl');
const bridgeId = config.get('matrix:bridge:id');
const hsToken = config.get('matrix:bridge:hsToken');
const asToken = config.get('matrix:bridge:asToken');
const senderLocalpart = config.get('matrix:bridge:senderLocalpart');

const registrationConfig = AppServiceRegistration.fromObject({
  id: bridgeId,
  hs_token: hsToken,
  as_token: asToken,
  namespaces: {
    users: [
      {
        exclusive: true,
        regex: `@.*-[0-9a-f]+:${serverName}`
      }
    ],
    aliases: [],
    rooms: [
      {
        exclusive: true,
        // We only want the bridge to be able to create rooms
        regex: '.*'
      }
    ]
  },
  url: bridgeUrl,
  sender_localpart: senderLocalpart,
  rate_limited: true,
  protocols: null
});

(async () => {
  // Save this out to a file for local dev Docker usage
  if (process.env.NODE_ENV === 'dev') {
    const savePath = path.join(__dirname, '../../../scripts/docker/matrix/synapse/data/');

    await fs.mkdirp(savePath);
    await registrationConfig.outputAsYaml(
      path.join(savePath, 'gitter-matrix-as-registration.yaml')
    );
  }
})();

let eventHandler;

const matrixBridge = new Bridge({
  homeserverUrl: homeserverUrl,
  domain: serverName,
  registration: registrationConfig,
  disableStores: true,
  controller: {
    // TODO: What is this for? Just from the Slack how-to (https://github.com/matrix-org/matrix-appservice-bridge/blob/develop/HOWTO.md)
    onUserQuery: function(queriedUser) {
      // auto-provision users with no additonal data
      return {};
    },

    onEvent: async (request /*, context*/) => {
      try {
        const event = request.getData();
        console.log('event', event);
        eventHandler.onEvent(event);
        stats.eventHF('matrix-bridge.event.success');
      } catch (err) {
        console.log('event err', err);
        stats.eventHF('matrix-bridge.event.fail');
      }
    }
  }
});

eventHandler = new MatrixEventHandler(matrixBridge, senderLocalpart);

module.exports = matrixBridge;
