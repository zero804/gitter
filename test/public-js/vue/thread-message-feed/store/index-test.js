'use strict';

jest.mock('../../../../../public/js/utils/appevents');
jest.mock('../../../../../public/js/components/api-client');

const testAction = require('../../store/vuex-action-helper');
const appEvents = require('../../../../../public/js/utils/appevents');
const apiClient = require('../../../../../public/js/components/api-client');
const {
  default: { actions, mutations },
  types
} = require('../../../../../public/js/vue/thread-message-feed/store');

describe('thread message feed store', () => {
  describe('actions', () => {
    beforeEach(() => {
      appEvents.trigger.mockReset();
    });

    it('open shows TMF, hides right toolbar, sets parent id', async () => {
      const parentMessage = {
        id: '5d147ea84dad9dfbc522317a'
      };
      await testAction(
        actions.open,
        '5d147ea84dad9dfbc522317a',
        { messageMap: { [parentMessage.id]: parentMessage } },
        [
          { type: types.TOGGLE_THREAD_MESSAGE_FEED, payload: true },
          { type: types.SET_PARENT_MESSAGE, payload: parentMessage }
        ]
      );
      expect(appEvents.trigger).toHaveBeenCalledWith('vue:right-toolbar:toggle', false);
    });

    it('close hides TMF, shows right toolbar, unsets parent id', async () => {
      await testAction(actions.close, undefined, {}, [
        { type: types.TOGGLE_THREAD_MESSAGE_FEED, payload: false },
        { type: types.SET_PARENT_MESSAGE, payload: null }
      ]);
      expect(appEvents.trigger).toHaveBeenCalledWith('vue:right-toolbar:toggle', true);
    });

    it('updateDraftMessage changes draft message in the state', async () => {
      await testAction(actions.updateDraftMessage, 'testMessage', {}, [
        { type: types.UPDATE_DRAFT_MESSAGE, payload: 'testMessage' }
      ]);
    });

    it('sendMessage creates message object and submits it to the collection', async () => {
      await testAction(actions.sendMessage, undefined, { draftMessage: 'testMessage' }, [
        { type: types.UPDATE_DRAFT_MESSAGE, payload: '' }
      ]);
      expect(apiClient.room.post).toHaveBeenCalledWith('/chatMessages', { text: 'testMessage' });
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

    it('SET_PARENT_MESSAGE', () => {
      const parentMessage = {
        id: '5d147ea84dad9dfbc522317a'
      };
      const state = {};
      mutations[types.SET_PARENT_MESSAGE](state, parentMessage);
      expect(state.parentMessage).toEqual(parentMessage);
    });
  });
});
