'use strict';

function getProfileUrlFromVirtualUser(virtualUser) {
  if (virtualUser.type === 'matrix') {
    return `https://matrix.to/#/@${virtualUser.externalId}`;
  }

  return null;
}

module.exports = getProfileUrlFromVirtualUser;
