'use strict';

const assert = require('assert');
const _ = require('lodash');
const testRequire = require('../../../test-require');
const mockito = require('jsmockito').JsMockito;
const underlyingUnreadItemService = require('gitter-web-unread-items');
const unreadItemServiceMock = mockito.spy(underlyingUnreadItemService);
const getChatSnapshotOptions = testRequire.withProxies(
  './handlers/renderers/chat/chat-snapshot-options',
  {
    'gitter-web-unread-items': unreadItemServiceMock
  }
);

describe('chat-snapshot-options', function() {
  const whenUnreadItemsAre = unreadItems =>
    mockito
      .when(unreadItemServiceMock)
      .getUnreadItemsForUser()
      .then(() => {
        return Promise.resolve({ chat: unreadItems });
      });

  it('returns default and passed values', async () => {
    mockito
      .when(unreadItemServiceMock)
      .getUnreadItemsForUser()
      .then((userId, troupeId) => {
        assert.equal(userId, 'user-id-1');
        assert.equal(troupeId, 'troupe-id-1');
        return Promise.resolve({ chat: [] });
      });
    const result = await getChatSnapshotOptions('user-id-1', 'troupe-id-1', { query: {} }, false);
    assert.deepEqual(result, {
      limit: 50,
      aroundId: undefined,
      unread: false
    });
  });

  it('returns unread items count + 20', async () => {
    whenUnreadItemsAre(_.range(60));
    const result = await getChatSnapshotOptions('user-id-1', 'troupe-id-1', { query: {} }, false);
    assert.equal(result.limit, 80);
  });

  it('passes through aroundId', async () => {
    whenUnreadItemsAre([]);
    const result = await getChatSnapshotOptions(
      'user-id-1',
      'troupe-id-1',
      { query: { at: '5d2ebf1d4f7f9e219c0aef0d' } },
      false
    );
    assert.equal(result.aroundId, '5d2ebf1d4f7f9e219c0aef0d');
  });

  it('passes through unread', async () => {
    whenUnreadItemsAre([]);
    const result = await getChatSnapshotOptions('user-id-1', 'troupe-id-1', { query: {} }, true);
    assert.equal(result.unread, true);
  });
});
