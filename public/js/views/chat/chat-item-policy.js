'use strict';

class ChatItemPolicy {
  constructor({ id, fromUser }, { isEmbedded, currentUserId, isTroupeAdmin }) {
    this.id = id;
    this.fromUser = fromUser;
    this.environment = { isEmbedded, currentUserId, isTroupeAdmin };
  }

  canDelete() {
    const { isEmbedded, isTroupeAdmin } = this.environment;
    return this.id && !isEmbedded && (this.isOwnMessage() || isTroupeAdmin);
  }

  isOwnMessage() {
    if (!this.fromUser) return false;
    return this.fromUser.id === this.environment.currentUserId;
  }
}

module.exports = ChatItemPolicy;
