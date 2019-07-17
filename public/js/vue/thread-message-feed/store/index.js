import appEvents from '../../../utils/appevents';
import apiClient from '../../../components/api-client';

// Exported for testing
export const types = {
  TOGGLE_THREAD_MESSAGE_FEED: 'TOGGLE_THREAD_MESSAGE_FEED',
  SET_PARENT_MESSAGE_ID: 'SET_PARENT_MESSAGE_ID',
  UPDATE_DRAFT_MESSAGE: 'UPDATE_DRAFT_MESSAGE'
};

export default {
  namespaced: true,
  state: {
    isVisible: false,
    draftMessage: '',
    parentId: null
  },
  mutations: {
    [types.TOGGLE_THREAD_MESSAGE_FEED](state, isVisible) {
      state.isVisible = isVisible;
    },
    [types.SET_PARENT_MESSAGE_ID](state, parentId) {
      state.parentId = parentId;
    },
    [types.UPDATE_DRAFT_MESSAGE](state, draftMessage) {
      state.draftMessage = draftMessage;
    }
  },
  getters: {
    parentMessage: (state, getters, rootState) => {
      return rootState.messageMap[state.parentId] || {};
    }
  },
  actions: {
    open: ({ commit }, parentId) => {
      commit(types.TOGGLE_THREAD_MESSAGE_FEED, true);
      commit(types.SET_PARENT_MESSAGE_ID, parentId);
      appEvents.trigger('vue:right-toolbar:toggle', false);
    },
    close: ({ commit }) => {
      commit(types.TOGGLE_THREAD_MESSAGE_FEED, false);
      commit(types.SET_PARENT_MESSAGE_ID, null);
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
