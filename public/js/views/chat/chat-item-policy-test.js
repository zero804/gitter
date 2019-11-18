'use strict';

const assert = require('assert');
const ChatItemPolicy = require('./chat-item-policy');

describe('ChatItemPolicy', () => {
  describe('canDelete', () => {
    const testAttributes = { id: '1', fromUser: { id: 'user1' } };

    it('can be deleted by message author', () => {
      const chatItemPolicy = new ChatItemPolicy(testAttributes, { currentUserId: 'user1' });
      assert(chatItemPolicy.canDelete());
    });

    it('can not be deleted by non author', () => {
      const chatItemPolicy = new ChatItemPolicy(testAttributes, { currentUserId: 'user2' });
      assert(!chatItemPolicy.canDelete());
    });

    it('can be deleted by troupe admin', () => {
      const chatItemPolicy = new ChatItemPolicy(testAttributes, {
        currentUserId: 'user2',
        isTroupeAdmin: true
      });
      assert(chatItemPolicy.canDelete());
    });

    it('can not be deleted when in embedded mode', () => {
      const chatItemPolicy = new ChatItemPolicy(testAttributes, {
        currentUserId: 'user1',
        isEmbedded: true
      });
      assert(!chatItemPolicy.canDelete());
    });
  });
  describe('isOwnMessage', () => {
    it('is own message when author matches current user', () => {
      const chatItemPolicy = new ChatItemPolicy(
        { fromUser: { id: 'user1' } },
        { currentUserId: 'user1' }
      );
      assert(chatItemPolicy.isOwnMessage());
    });
    it('is not own message when author differs from current user', () => {
      const chatItemPolicy = new ChatItemPolicy(
        { fromUser: { id: 'user1' } },
        { currentUserId: 'user2' }
      );
      assert(!chatItemPolicy.isOwnMessage());
    });
  });
});
