'use strict';

// When EDIT_WINDOW is updated here on the frontend, also update it in the backend `chatService`
const EDIT_WINDOW = 1000 * 60 * 10; // 10 minutes

class ChatItemPolicy {
  constructor({ id, fromUser, sent, text }, { isEmbedded, currentUserId, isTroupeAdmin }) {
    this.id = id;
    this.fromUser = fromUser;
    this.sent = sent;
    this.text = text;
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

  canEdit() {
    const { isEmbedded } = this.environment;
    return this.id && this.text && !isEmbedded && this.isOwnMessage() && this._isInEditablePeriod;
  }

  /**
   * PRIVATE METHOD: Returns true if this chat item can still be edited.
   */
  get _isInEditablePeriod() {
    // item without sent date can't be edited
    if (!this.sent) return false;
    const stopsBeingEditableAtDate = new Date(this.sent.valueOf() + EDIT_WINDOW);
    return new Date() < stopsBeingEditableAtDate;
  }
}

module.exports = ChatItemPolicy;
