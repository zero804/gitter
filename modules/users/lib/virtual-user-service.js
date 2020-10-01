'use strict';

// This is used for lookUps when chat messages are serialized
// Just trying to make things compatible with the old `message.fromUser` world
function getMockIdFromVirtualUser(virtualUser) {
  return `${virtualUser.type}-${virtualUser.externalId}`;
}

// Because we have other apps that we don't want to update to support virtualUsers directly
// (like the iOS/Android apps),
// we want to just mock/stub `message.fromUser` so everything continues to look and function normally
function transformVirtualUserIntoMockedFromUser(virtualUser) {
  return {
    id: getMockIdFromVirtualUser(virtualUser),
    username: virtualUser.externalId,
    displayName: virtualUser.displayName,
    avatarUrl: virtualUser.avatarUrl,
    avatarUrlSmall: virtualUser.avatarUrl,
    avatarUrlMedium: virtualUser.avatarUrl
  };
}

module.exports = {
  getMockIdFromVirtualUser,
  transformVirtualUserIntoMockedFromUser
};
