'use strict';

class IdentityStrategy {
  preload() {}

  map(item) {
    return {
      id: item.id || item._id,
      userId: item.userId,
      provider: item.provider,
      providerKey: item.providerKey,
      username: item.username,
      displayName: item.displayName,
      email: item.email,
      avatar: item.avatar
    };
  }
}

module.exports = IdentityStrategy;
