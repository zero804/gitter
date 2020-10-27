'use strict';

var env = require('gitter-web-env');
var logger = env.logger;
var stats = env.stats;

// eslint-disable-next-line complexity
function clientKeyIsInternal(clientKey) {
  switch (clientKey) {
    case 'web-internal': // The webapp
    case '1': // old OSX app
    case '2': // old Beta OSX app
    case '4': // old Troupe Notifier OSX app
    case '5': // old Troupe Notifier Beta OSX app
    case 'osx-desktop-prod':
    case 'windows-desktop-prod':
    case 'linux-desktop-prod':
    case 'osx-desktop-prod-v4':
    case 'windows-desktop-prod-v4':
    case 'linux-desktop-prod-v4':
    case 'android-prod':
    case 'ios-beta':
    case 'ios-beta-dev':
    case 'ios-prod':
    case 'ios-prod-dev':
      return true;
  }

  return false;
}

/**
 * In future we should add scopes to our client schema, rather than
 * doing this, which is horrible
 */
function isInternalClient(req) {
  if (!req.authInfo || !req.authInfo.client) return false;

  const client = req.authInfo.client;
  if (!client) return false;
  if (!client.clientKey) return false;
  if (client.canSkipAuthorization) return true;

  return clientKeyIsInternal(client.clientKey);
}

function logAccessDenied(user, client, originalUrl) {
  var clientKey = client && client.clientKey;
  var clientId = client && (client.id || client._id);
  var userId = user && (user.id || user._id);

  logger.error('Non internal client attempted to access private API', {
    clientKey: clientKey,
    clientId: clientId,
    userId: userId,
    path: originalUrl
  });

  stats.event('internalapi.access.denied');
}

function isRequestFromInternalClient(req) {
  if (!isInternalClient(req)) {
    logAccessDenied(req.user, req.client, req.originalUrl);
    return false;
  }

  return true;
}

module.exports = {
  isRequestFromInternalClient: isRequestFromInternalClient
};
