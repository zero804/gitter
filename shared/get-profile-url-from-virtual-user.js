'use strict';

function getProfileUrlFromVirtualUser(virtualUser) {
  if (virtualUser.type === 'matrix') {
    return `https://matrix.to/#/@${virtualUser.externalId}?utm_source=gitter`;
  }

  return null;
}

module.exports = getProfileUrlFromVirtualUser;
