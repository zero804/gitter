'use strict';

jest.mock('../../../../../public/js/utils/appevents');

const testAction = require('../../store/vuex-action-helper');
const appEvents = require('../../../../../public/js/utils/appevents');
const {
  default: { actions, mutations },
  types
} = require('../../../../../public/js/vue/thread-message-feed/store');

describe('thread message feed store', () => {
  describe('actions', () => {
    it('toggle commits correct mutation', async () => {
      await testAction(actions.toggle, true, { isVisible: false }, [
        { type: types.TOGGLE_THREAD_MESSAGE_FEED, payload: true }
      ]);
      expect(appEvents.trigger.mock.calls[0]).toEqual(['vue:right-toolbar:toggle', false]);
    });
  });
  describe('mutations', () => {
    it('TOGGLE_THREAD_MESSAGE_FEED sets new opened state', () => {
      const state = {};
      mutations[types.TOGGLE_THREAD_MESSAGE_FEED](state, true);
      expect(state.isVisible).toEqual(true);
    });
  });
});
