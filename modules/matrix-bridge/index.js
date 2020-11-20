'use strict';

const env = require('gitter-web-env');
const logger = env.logger;
const config = env.config;
const obfuscateToken = require('gitter-web-github').obfuscateToken;

const matrixBridge = require('./lib/matrix-bridge');
const GitterBridge = require('./lib/gitter-bridge');

const bridgePort = config.get('matrix:bridge:applicationServicePort');
const hsToken = config.get('matrix:bridge:hsToken');
const asToken = config.get('matrix:bridge:asToken');

async function install() {
  if (!bridgePort || !hsToken || !asToken) {
    logger.info(
      `No (bridgePort=${bridgePort}, hsToken=${obfuscateToken(hsToken)}, asToken=${obfuscateToken(
        asToken
      )}) specified for Matrix bridge so we won't start it up`
    );
    return;
  }

  // config is always null, see https://github.com/matrix-org/matrix-appservice-bridge/issues/262
  const config = null;

  await matrixBridge.run(bridgePort, config);
  logger.info(`Matrix bridge listening on port ${bridgePort}`);

  new GitterBridge(matrixBridge);
}

module.exports = install;
