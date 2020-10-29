'use strict';

const env = require('gitter-web-env');
const logger = env.logger;

const matrixBridge = require('./lib/matrix-bridge');
const GitterBridge = require('./lib/gitter-bridge');

async function install(bridgePort) {
  // config is always null, see https://github.com/matrix-org/matrix-appservice-bridge/issues/262
  const config = null;

  await matrixBridge.run(bridgePort, config);
  logger.info(`Matrix bridge listening on port ${bridgePort}`);

  new GitterBridge(matrixBridge);
}

module.exports = install;
