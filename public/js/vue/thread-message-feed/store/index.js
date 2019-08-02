import appEvents from '../../../utils/appevents';
import apiClient from '../../../components/api-client';

// Exported for testing
export const types = {
  TOGGLE_THREAD_MESSAGE_FEED: 'TOGGLE_THREAD_MESSAGE_FEED',
  SET_PARENT_MESSAGE_ID: 'SET_PARENT_MESSAGE_ID',
  UPDATE_DRAFT_MESSAGE: 'UPDATE_DRAFT_MESSAGE',
  UPDATE_CHILD_MESSAGES: 'UPDATE_CHILD_MESSAGES',
  REQUEST_CHILD_MESSAGES: 'REQUEST_CHILD_MESSAGES',
  RECEIVE_CHILD_MESSAGES_SUCCESS: 'RECEIVE_CHILD_MESSAGES_SUCCESS',
  RECEIVE_CHILD_MESSAGES_ERROR: 'RECEIVE_CHILD_MESSAGES_ERROR'
};

export default {
  namespaced: true,
  state: {
    isVisible: false,
    draftMessage: '',
    parentId: null,
    childMessages: { loading: false, error: false, results: [] }
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
    },
    [types.REQUEST_CHILD_MESSAGES](state) {
      state.childMessages.error = false;
      state.childMessages.loading = true;
    },
    [types.RECEIVE_CHILD_MESSAGES_SUCCESS](state, childMessages) {
      state.childMessages.error = false;
      state.childMessages.loading = false;
      state.childMessages.results = childMessages;
    },
    [types.RECEIVE_CHILD_MESSAGES_ERROR](state) {
      state.childMessages.error = true;
      state.childMessages.loading = false;
      state.childMessages.results = [];
    }
  },
  getters: {
    parentMessage: (state, getters, rootState) => {
      return rootState.messageMap[state.parentId];
    }
  },
  actions: {
    open: ({ commit, dispatch }, parentId) => {
      commit(types.TOGGLE_THREAD_MESSAGE_FEED, true);
      commit(types.SET_PARENT_MESSAGE_ID, parentId);
      dispatch('fetchChildMessages');
      appEvents.trigger('vue:right-toolbar:toggle', false);
    },
    close: ({ commit }) => {
      commit(types.TOGGLE_THREAD_MESSAGE_FEED, false);
      commit(types.SET_PARENT_MESSAGE_ID, null);
      commit(types.UPDATE_CHILD_MESSAGES, []);
      appEvents.trigger('vue:right-toolbar:toggle', true);
    },
    updateDraftMessage: ({ commit }, newDraftMessage) => {
      commit(types.UPDATE_DRAFT_MESSAGE, newDraftMessage);
    },
    sendMessage: ({ state, commit }) => {
      const message = {
        text: state.draftMessage,
        parentId: state.parentId
      };
      // TODO add the temporary message to the feed + react on success or failure
      apiClient.room.post('/chatMessages', message);
      commit(types.UPDATE_DRAFT_MESSAGE, '');
    },
    fetchChildMessages: ({ state, commit }) => {
      commit(types.REQUEST_CHILD_MESSAGES);
      apiClient.room
        .get(`/chatMessages/${state.parentId}/thread`)
        .then(childMessages => commit(types.RECEIVE_CHILD_MESSAGES_SUCCESS, childMessages))
        .catch((/* error */) => {
          // TODO log error
          commit(types.RECEIVE_CHILD_MESSAGES_ERROR);
        });
    }
  }
};
