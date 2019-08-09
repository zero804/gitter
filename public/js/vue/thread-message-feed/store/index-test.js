jest.mock('../../../utils/appevents');
jest.mock('../../../components/api-client');
jest.spyOn(Date, 'now').mockImplementation(() => 1479427200000);

const testAction = require('../../store/__test__/vuex-action-helper');
const appEvents = require('../../../utils/appevents');
const apiClient = require('../../../components/api-client');
const { createSerializedMessageFixture } = require('../../__test__/fixture-helpers');
import * as rootTypes from '../../store/mutation-types';
const {
  default: { actions, mutations, getters },
  types
} = require('.');

describe('thread message feed store', () => {
  describe('actions', () => {
    beforeEach(() => {
      appEvents.trigger.mockReset();
      apiClient.room.get.mockReset();
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
        { type: types.SET_PARENT_MESSAGE_ID, payload: null }
      ]);
      expect(appEvents.trigger).toHaveBeenCalledWith('vue:right-toolbar:toggle', true);
    });

    it('updateDraftMessage changes draft message in the state', async () => {
      await testAction(actions.updateDraftMessage, 'testMessage', {}, [
        { type: types.UPDATE_DRAFT_MESSAGE, payload: 'testMessage' }
      ]);
    });

    describe('sendMessage', () => {
      let storedMessage, tmpMessage, initialState;
      beforeEach(() => {
        storedMessage = createSerializedMessageFixture({ id: '5d147ea84dad9dfbc522317a' });
        initialState = { parentId: '5d11d571a2405419771cd3ee', draftMessage: 'testMessage' };
        tmpMessage = {
          id: `tmp-${Date.now()}`,
          fromUser: undefined,
          text: initialState.draftMessage,
          parentId: initialState.parentId
        };
        apiClient.room.post.mockReset();
      });
      it('sendMessage creates message object and submits it to the collection', async () => {
        apiClient.room.post.mockResolvedValue(storedMessage);
        await testAction(actions.sendMessage, undefined, initialState, [
          { type: rootTypes.ADD_TO_MESSAGE_MAP, payload: [tmpMessage] },
          { type: types.UPDATE_DRAFT_MESSAGE, payload: '' },
          { type: rootTypes.REMOVE_FROM_MESSAGE_MAP, payload: tmpMessage.id },
          { type: rootTypes.ADD_TO_MESSAGE_MAP, payload: [storedMessage] }
        ]);
        expect(apiClient.room.post).toHaveBeenCalledWith('/chatMessages', {
          text: 'testMessage',
          parentId: '5d11d571a2405419771cd3ee'
        });
      });

      it('sendMessage marks failed message with an error', async () => {
        apiClient.room.post.mockRejectedValue(null);
        await testAction(actions.sendMessage, undefined, initialState, [
          { type: rootTypes.ADD_TO_MESSAGE_MAP, payload: [tmpMessage] },
          { type: types.UPDATE_DRAFT_MESSAGE, payload: '' },
          { type: rootTypes.ADD_TO_MESSAGE_MAP, payload: [{ ...tmpMessage, error: true }] }
        ]);
      });
    });

    describe('fetchChildMessages', () => {
      it('success', async () => {
        apiClient.room.get.mockImplementation(() => Promise.resolve(['result1']));
        await testAction(
          actions.fetchChildMessages,
          undefined,
          { parentId: '5d11d571a2405419771cd3ee' },
          [
            { type: types.REQUEST_CHILD_MESSAGES },
            { type: types.RESPONSE_CHILD_MESSAGES_SUCCESS },
            { type: rootTypes.ADD_TO_MESSAGE_MAP, payload: ['result1'] }
          ]
        );
      });

      it('error', async () => {
        apiClient.room.get.mockImplementation(() => Promise.reject(null));
        await testAction(
          actions.fetchChildMessages,
          undefined,
          { parentId: '5d11d571a2405419771cd3ee' },
          [{ type: types.REQUEST_CHILD_MESSAGES }, { type: types.RESPONSE_CHILD_MESSAGES_ERROR }]
        );
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

    describe('CHILD_MESSAGES', () => {
      it('REQUEST_CHILD_MESSAGES', () => {
        const state = { childMessagesRequest: { loading: false, error: true } };
        mutations[types.REQUEST_CHILD_MESSAGES](state);
        expect(state.childMessagesRequest).toEqual({ loading: true, error: false });
      });
      it('RESPONSE_CHILD_MESSAGES_SUCCESS', () => {
        const state = { childMessagesRequest: { loading: true, error: true } };
        mutations[types.RESPONSE_CHILD_MESSAGES_SUCCESS](state);
        expect(state.childMessagesRequest).toEqual({ loading: false, error: false });
      });
      it('RESPONSE_CHILD_MESSAGES_ERROR', () => {
        const state = { childMessagesRequest: { loading: true, error: false } };
        mutations[types.RESPONSE_CHILD_MESSAGES_ERROR](state);
        expect(state.childMessagesRequest).toEqual({ loading: false, error: true });
      });
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
