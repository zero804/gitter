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
  types,
  childMessagesVuexRequest
} = require('.');

describe('thread message feed store', () => {
  describe('actions', () => {
    beforeEach(() => {
      appEvents.trigger.mockReset();
      apiClient.room.get.mockReset();
    });

    it('open shows TMF, clears state, hides right toolbar, sets parent id ', async () => {
      await testAction(
        actions.open,
        '5d147ea84dad9dfbc522317a',
        {},
        [
          { type: types.CLEAR_STATE },
          { type: types.TOGGLE_THREAD_MESSAGE_FEED, payload: true },
          { type: types.SET_PARENT_MESSAGE_ID, payload: '5d147ea84dad9dfbc522317a' }
        ],
        [{ type: 'fetchInitialMessages' }]
      );
      expect(appEvents.trigger).toHaveBeenCalledWith('vue:right-toolbar:toggle', false);
    });

    it('close hides TMF, shows right toolbar, unsets parent id', async () => {
      await testAction(actions.close, undefined, {}, [
        { type: types.TOGGLE_THREAD_MESSAGE_FEED, payload: false }
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
        initialState = {
          parentId: '5d11d571a2405419771cd3ee',
          draftMessage: 'testMessage',
          user: { _id: 'userId' }
        };
        tmpMessage = {
          id: `tmp-5d11d571a2405419771cd3ee-userId-testMessage`,
          fromUser: { _id: 'userId' },
          text: initialState.draftMessage,
          parentId: initialState.parentId,
          sent: new Date(Date.now()),
          loading: true
        };
        apiClient.room.post.mockReset();
      });
      it('sendMessage creates message object and submits it to the collection', async () => {
        apiClient.room.post.mockResolvedValue(storedMessage);
        await testAction(actions.sendMessage, undefined, initialState, [
          { type: rootTypes.ADD_TO_MESSAGE_MAP, payload: [tmpMessage] },
          { type: types.UPDATE_DRAFT_MESSAGE, payload: '' },
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
          {
            type: rootTypes.ADD_TO_MESSAGE_MAP,
            payload: [{ ...tmpMessage, error: true, loading: false }]
          }
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
            { type: childMessagesVuexRequest.requestType },
            { type: childMessagesVuexRequest.successType },
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
          [
            { type: childMessagesVuexRequest.requestType },
            { type: childMessagesVuexRequest.errorType }
          ]
        );
      });
    });

    describe('fetchInitialMessages', () => {
      it('calls fetchChildMessages', async () => {
        await testAction(
          actions.fetchInitialMessages,
          undefined,
          {},
          [{ type: types.SET_AT_BOTTOM }],
          [{ type: 'fetchChildMessages' }],
          () => {},
          { fetchChildMessages: new Array(15).fill('a') }
        );
      });

      it('calls fetchChildMessages and marks that we reached the top', async () => {
        await testAction(
          actions.fetchInitialMessages,
          undefined,
          {},
          [{ type: types.SET_AT_BOTTOM }, { type: types.SET_AT_TOP }],
          [{ type: 'fetchChildMessages' }],
          () => {},
          { fetchChildMessages: new Array(10).fill('a') }
        );
      });
    });

    describe('fetchEarlierMessages', () => {
      const testMessageOverrides = [{ id: '1' }, { id: '2' }];
      const childMessages = testMessageOverrides.map(m => createSerializedMessageFixture(m));

      it('calls fetchChildMessages with beforeId', async () => {
        await testAction(
          actions.fetchEarlierMessages,
          undefined,
          { childMessages },
          [],
          [{ type: 'fetchChildMessages', payload: { beforeId: '1' } }],
          () => {},
          { fetchChildMessages: new Array(15).fill('a') }
        );
      });

      it('calls fetchChildMessages and marks that we reached the top', async () => {
        await testAction(
          actions.fetchEarlierMessages,
          undefined,
          { childMessages },
          [{ type: types.SET_AT_TOP }],
          [{ type: 'fetchChildMessages', payload: { beforeId: '1' } }],
          () => {},
          { fetchChildMessages: new Array(10).fill('a') }
        );
      });

      it('does nothing when we reached the top already', async () => {
        await testAction(actions.fetchEarlierMessages, undefined, { atTop: true }, [], []);
      });

      it('does nothing when there are no child messages', async () => {
        await testAction(actions.fetchEarlierMessages, undefined, { childMessages: [] }, [], []);
      });
    });

    describe('fetchLaterMessages', () => {
      const testMessageOverrides = [{ id: '1' }, { id: '2' }];
      const childMessages = testMessageOverrides.map(m => createSerializedMessageFixture(m));

      it('calls fetchChildMessages with afterId', async () => {
        await testAction(
          actions.fetchLaterMessages,
          undefined,
          { childMessages },
          [],
          [{ type: 'fetchChildMessages', payload: { afterId: '2' } }],
          () => {},
          { fetchChildMessages: new Array(15).fill('a') }
        );
      });

      it('calls fetchChildMessages and marks that we reached the bottom', async () => {
        await testAction(
          actions.fetchLaterMessages,
          undefined,
          { childMessages },
          [{ type: types.SET_AT_BOTTOM }],
          [{ type: 'fetchChildMessages', payload: { afterId: '2' } }],
          () => {},
          { fetchChildMessages: new Array(10).fill('a') }
        );
      });

      it('does nothing when we reached the bottom already', async () => {
        await testAction(actions.fetchLaterMessages, undefined, { atBottom: true }, [], []);
      });

      it('does nothing when there are no child messages', async () => {
        await testAction(actions.fetchLaterMessages, undefined, { childMessages: [] }, [], []);
      });
    });

    it('highlightChildMessage opens TMF and highlights child message', async () => {
      await testAction(
        actions.highlightChildMessage,
        { parentId: 'abc', id: 'def' },
        {},
        // ideally, we would test the delayed mutation setting highlighted to false, but we won't wait
        // 5 seconds for it, the risk and impact of highlight staying on are low
        [{ type: rootTypes.UPDATE_MESSAGE, payload: { id: 'def', highlighted: true } }],
        [{ type: 'open', payload: 'abc' }]
      );
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

    it('SET_AT_TOP', () => {
      const state = {};
      mutations[types.SET_AT_TOP](state);
      expect(state.atTop).toEqual(true);
    });

    it('SET_AT_BOTTOM', () => {
      const state = {};
      mutations[types.SET_AT_BOTTOM](state);
      expect(state.atBottom).toEqual(true);
    });

    it('CLEAR_STATE', () => {
      const state = {
        parentId: '5d147ea84dad9dfbc522317a',
        draftMessage: 'abc',
        atTop: true,
        atBottom: true
      };
      mutations[types.CLEAR_STATE](state);
      expect(state).toEqual({ parentId: null, draftMessage: '', atTop: false, atBottom: false });
    });

    it('includes childMessageVuexRequest', () => {
      const state = childMessagesVuexRequest.initialState;
      mutations[childMessagesVuexRequest.errorType](state);
      expect(state.childMessagesRequest.error).toEqual(true);
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

    it('childMessages filters messages by parentId and sorts them by sent date', () => {
      const testMessageOverrides = [
        { id: '1' },
        { id: '2', parentId: '1a2b3c', sent: '2016-05-18T02:48:51.386Z' },
        { id: '3', parentId: '1a2b3c', sent: '2016-05-17T02:48:51.386Z' }
      ];
      const messageMap = testMessageOverrides.reduce(
        (acc, m) => ({ ...acc, [m.id]: createSerializedMessageFixture(m) }),
        {}
      );
      const state = { parentId: '1a2b3c' };
      const rootState = { messageMap };
      const result = getters.childMessages(state, {}, rootState);
      expect(result.map(m => m.id)).toEqual(['3', '2']);
    });
  });
});
