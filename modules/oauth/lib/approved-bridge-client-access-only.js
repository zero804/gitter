'use strict';

var env = require('gitter-web-env');
var logger = env.logger;
var stats = env.stats;
var config = env.config;
const { validateVirtualUserType } = require('gitter-web-users/lib/virtual-user-service');

// OAuth client key to virtual user type map
const approvedClientKeyMap = config.get('virtualUsers:approvedClientKeyMap') || {};

// Approved OAuth client apps that can bridge messages into Gitter and use `message.virtualUser`
/**
 * In future we should add scopes to our client schema, rather than
 * doing this, which is horrible
 */
function isApprovedBridgeClientForVirtualUserType(req, virtualUserType) {
  if (!req.authInfo || !req.authInfo.client) return false;

  const client = req.authInfo.client;
  if (!client) return false;
  if (!client.clientKey) return false;

  // We only want to allow a person using an OAuth access token from
  // an approved OAuth app to be able to send messages with specified type of virtual users.
  if (approvedClientKeyMap[client.clientKey] === virtualUserType) {
    return true;
  }

  return false;
}

function logAccessDenied(user, client, originalUrl) {
  const clientKey = client && client.clientKey;
  const clientId = client && (client.id || client._id);
  const userId = user && (user.id || user._id);

  logger.error('Non approved bridge client attempted to access private API', {
    clientKey: clientKey,
    clientId: clientId,
    userId: userId,
    path: originalUrl
  });

  stats.event('non-approved-bridge-client.access.denied');
}

function isRequestFromApprovedBridgeClient(req, virtualUser) {
  validateVirtualUserType(virtualUser.type);

  if (!isApprovedBridgeClientForVirtualUserType(req, virtualUser.type)) {
    logAccessDenied(req.user, req.client, req.originalUrl);
    return false;
  }

  return true;
}

module.exports = {
  isRequestFromApprovedBridgeClient,
  testOnly: {
    approvedClientKeyMap
  }
};
