import appEvents from '../../../utils/appevents';
import apiClient from '../../../components/api-client';

// Exported for testing
export const types = {
  TOGGLE_THREAD_MESSAGE_FEED: 'TOGGLE_THREAD_MESSAGE_FEED',
  SET_PARENT_MESSAGE: 'SET_PARENT_MESSAGE',
  UPDATE_DRAFT_MESSAGE: 'UPDATE_DRAFT_MESSAGE'
};

export default {
  namespaced: true,
  state: {
    isVisible: false,
    draftMessage: '',
    parentMessage: null
  },
  mutations: {
    [types.TOGGLE_THREAD_MESSAGE_FEED](state, isVisible) {
      state.isVisible = isVisible;
    },
    [types.SET_PARENT_MESSAGE](state, parentMessage) {
      state.parentMessage = parentMessage;
    },
    [types.UPDATE_DRAFT_MESSAGE](state, draftMessage) {
      state.draftMessage = draftMessage;
    }
  },
  actions: {
    open: ({ commit, rootState }, parentId) => {
      commit(types.TOGGLE_THREAD_MESSAGE_FEED, true);
      commit(types.SET_PARENT_MESSAGE, rootState.messageMap[parentId]);
      appEvents.trigger('vue:right-toolbar:toggle', false);
    },
    close: ({ commit }) => {
      commit(types.TOGGLE_THREAD_MESSAGE_FEED, false);
      commit(types.SET_PARENT_MESSAGE, null);
      appEvents.trigger('vue:right-toolbar:toggle', true);
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
