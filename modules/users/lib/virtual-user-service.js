'use strict';

const StatusError = require('statuserror');
const generateProxyUrl = require('gitter-web-text-processor/lib/generate-proxy-url');

// We assume any username with a colon `:` in it, is a virtualUser from Matrix
function checkForMatrixUsername(username) {
  return username.indexOf(':') >= 0;
}

// This is used for lookUps when chat messages are serialized
// Just trying to make things compatible with the old `message.fromUser` world
function getMockIdFromVirtualUser(virtualUser) {
  return `${virtualUser.type}-${virtualUser.externalId}`;
}

// Because we have other apps that we don't want to update to support virtualUsers directly
// (like the iOS/Android apps),
// we want to just mock/stub `message.fromUser` so everything continues to look and function normally
function transformVirtualUserIntoMockedFromUser(virtualUser) {
  let proxiedAvatarUrl;
  if (virtualUser.avatarUrl) {
    proxiedAvatarUrl = generateProxyUrl(virtualUser.avatarUrl);
  }

  return {
    id: getMockIdFromVirtualUser(virtualUser),
    username: virtualUser.externalId,
    displayName: virtualUser.displayName,
    avatarUrl: proxiedAvatarUrl,
    avatarUrlSmall: proxiedAvatarUrl,
    avatarUrlMedium: proxiedAvatarUrl
  };
}

const validateVirtualUserType = type => {
  if (typeof type !== 'string')
    throw new StatusError(400, 'Virtual user type needs to be a string');
  else if (type.length > 255)
    throw new StatusError(400, 'Virtual user external type exceeds maximum length');
};

const validateVirtualUserExternalId = externalId => {
  if (typeof externalId !== 'string')
    throw new StatusError(400, 'Virtual user externalId needs to be a string');
  else if (externalId.length > 255)
    throw new StatusError(400, 'Virtual user external ID exceeds maximum length');
};

const validateVirtualUserDisplayName = displayName => {
  if (typeof displayName !== 'string')
    throw new StatusError(400, 'Virtual user displayName needs to be a string');
  else if (displayName.length > 255)
    throw new StatusError(400, 'Virtual user display name exceeds maximum length');
};

const validateVirtualUserAvatarUrl = avatarUrl => {
  // The avatarUrl needs to be a string but is option so can also be undefined
  if (typeof avatarUrl !== 'string' && avatarUrl !== undefined)
    throw new StatusError(400, 'Virtual user avatarUrl needs to be a string');
  else if (avatarUrl && avatarUrl.length > 2000)
    throw new StatusError(400, 'Virtual user avatarUrl exceeds maximum length');
};

module.exports = {
  checkForMatrixUsername,
  getMockIdFromVirtualUser,
  transformVirtualUserIntoMockedFromUser,
  validateVirtualUserType,
  validateVirtualUserExternalId,
  validateVirtualUserDisplayName,
  validateVirtualUserAvatarUrl
};
