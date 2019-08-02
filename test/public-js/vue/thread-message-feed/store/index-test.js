'use strict';

jest.mock('../../../../../public/js/utils/appevents');
jest.mock('../../../../../public/js/components/api-client');

const testAction = require('../../store/vuex-action-helper');
const appEvents = require('../../../../../public/js/utils/appevents');
const apiClient = require('../../../../../public/js/components/api-client');
const { createSerializedMessageFixture } = require('../../fixture-helpers');
const {
  default: { actions, mutations, getters },
  types
} = require('../../../../../public/js/vue/thread-message-feed/store');

describe('thread message feed store', () => {
  describe('actions', () => {
    beforeEach(() => {
      appEvents.trigger.mockReset();
    });

    it('open shows TMF, hides right toolbar, sets parent id', async () => {
      await testAction(
        actions.open,
        '5d147ea84dad9dfbc522317a',
        {},
        [
          { type: types.TOGGLE_THREAD_MESSAGE_FEED, payload: true },
          { type: types.SET_PARENT_MESSAGE_ID, payload: '5d147ea84dad9dfbc522317a' }
        ],
        [{ type: 'fetchChildMessages' }]
      );
      expect(appEvents.trigger).toHaveBeenCalledWith('vue:right-toolbar:toggle', false);
    });

    it('close hides TMF, shows right toolbar, unsets parent id', async () => {
      await testAction(actions.close, undefined, {}, [
        { type: types.TOGGLE_THREAD_MESSAGE_FEED, payload: false },
        { type: types.SET_PARENT_MESSAGE_ID, payload: null },
        { type: types.UPDATE_CHILD_MESSAGES, payload: [] }
      ]);
      expect(appEvents.trigger).toHaveBeenCalledWith('vue:right-toolbar:toggle', true);
    });

    it('updateDraftMessage changes draft message in the state', async () => {
      await testAction(actions.updateDraftMessage, 'testMessage', {}, [
        { type: types.UPDATE_DRAFT_MESSAGE, payload: 'testMessage' }
      ]);
    });

    it('sendMessage creates message object and submits it to the collection', async () => {
      await testAction(
        actions.sendMessage,
        undefined,
        { parentId: '5d11d571a2405419771cd3ee', draftMessage: 'testMessage' },
        [{ type: types.UPDATE_DRAFT_MESSAGE, payload: '' }]
      );
      expect(apiClient.room.post).toHaveBeenCalledWith('/chatMessages', {
        text: 'testMessage',
        parentId: '5d11d571a2405419771cd3ee'
      });
    });
  });

  describe('mutations', () => {
    it('TOGGLE_THREAD_MESSAGE_FEED sets new opened state', () => {
      const state = {};
      mutations[types.TOGGLE_THREAD_MESSAGE_FEED](state, true);
      expect(state.isVisible).toEqual(true);
    });

    it('UPDATE_DRAFT_MESSAGE', () => {
      const state = {};
      mutations[types.UPDATE_DRAFT_MESSAGE](state, 'new draft message');
      expect(state.draftMessage).toEqual('new draft message');
    });

    it('SET_PARENT_MESSAGE_ID', () => {
      const state = {};
      mutations[types.SET_PARENT_MESSAGE_ID](state, '5d147ea84dad9dfbc522317a');
      expect(state.parentId).toEqual('5d147ea84dad9dfbc522317a');
    });

    it('UPDATE_CHILD_MESSAGES', () => {
      const state = {};
      const childMessage = createSerializedMessageFixture();
      mutations[types.UPDATE_CHILD_MESSAGES](state, [childMessage]);
      expect(state.childMessages).toEqual([childMessage]);
    });
  });

  describe('getters', () => {
    it('parentMessage', () => {
      const parentMessage = createSerializedMessageFixture();
      const state = { parentId: parentMessage.id };
      const rootState = { messageMap: { [parentMessage.id]: parentMessage } };
      const result = getters.parentMessage(state, {}, rootState);
      expect(result).toEqual(parentMessage);
    });
  });
});
