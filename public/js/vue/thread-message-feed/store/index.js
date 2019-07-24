import appEvents from '../../../utils/appevents';
import apiClient from '../../../components/api-client';

// Exported for testing
export const types = {
  TOGGLE_THREAD_MESSAGE_FEED: 'TOGGLE_THREAD_MESSAGE_FEED',
  UPDATE_DRAFT_MESSAGE: 'UPDATE_DRAFT_MESSAGE'
};

export default {
  namespaced: true,
  state: {
    isVisible: false,
    draftMessage: ''
  },
  mutations: {
    [types.TOGGLE_THREAD_MESSAGE_FEED](state, isVisible) {
      state.isVisible = isVisible;
    },
    [types.UPDATE_DRAFT_MESSAGE](state, draftMessage) {
      state.draftMessage = draftMessage;
    }
  },
  actions: {
    toggle: ({ commit }, isVisible) => {
      commit(types.TOGGLE_THREAD_MESSAGE_FEED, isVisible);
      appEvents.trigger('vue:right-toolbar:toggle', !isVisible);
    },
    updateDraftMessage: ({ commit }, newDraftMessage) => {
      commit(types.UPDATE_DRAFT_MESSAGE, newDraftMessage);
    },
    sendMessage: ({ state, commit }) => {
      const message = {
        text: state.draftMessage
      };
      // TODO add the temporary message to the feed + react on success or failure
      apiClient.room.post('/chatMessages', message);
      commit(types.UPDATE_DRAFT_MESSAGE, '');
    }
  }
};
