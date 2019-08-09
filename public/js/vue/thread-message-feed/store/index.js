import appEvents from '../../../utils/appevents';
import apiClient from '../../../components/api-client';
import moment from 'moment';
import * as _ from 'lodash';
import * as rootTypes from '../../store/mutation-types';

// Exported for testing
export const types = {
  TOGGLE_THREAD_MESSAGE_FEED: 'TOGGLE_THREAD_MESSAGE_FEED',
  SET_PARENT_MESSAGE_ID: 'SET_PARENT_MESSAGE_ID',
  UPDATE_DRAFT_MESSAGE: 'UPDATE_DRAFT_MESSAGE',
  REQUEST_CHILD_MESSAGES: 'REQUEST_CHILD_MESSAGES',
  RESPONSE_CHILD_MESSAGES_SUCCESS: 'RESPONSE_CHILD_MESSAGES_SUCCESS',
  RESPONSE_CHILD_MESSAGES_ERROR: 'RESPONSE_CHILD_MESSAGES_ERROR'
};

export default {
  namespaced: true,
  state: () => ({
    isVisible: false,
    draftMessage: '',
    parentId: null,
    childMessagesRequest: { loading: false, error: false }
  }),
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
      state.childMessagesRequest.loading = true;
      state.childMessagesRequest.error = false;
    },
    [types.RESPONSE_CHILD_MESSAGES_SUCCESS](state) {
      state.childMessagesRequest.loading = false;
      state.childMessagesRequest.error = false;
    },
    [types.RESPONSE_CHILD_MESSAGES_ERROR](state) {
      state.childMessagesRequest.loading = false;
      state.childMessagesRequest.error = true;
    }
  },
  getters: {
    parentMessage: (state, getters, rootState) => {
      return rootState.messageMap[state.parentId];
    },
    childMessages: (state, getters, rootState) => {
      const { parentId } = state;
      const childMessages = Object.values(rootState.messageMap).filter(
        m => m.parentId === parentId
      );
      const uniqueMessages = _.uniq(childMessages, false, 'id');
      // we use moment because the messages combine messages from bayeux and ordinary json messages (fetch during TMF open)
      return uniqueMessages.sort((m1, m2) => moment(m1.sent).diff(m2.sent)); // sort from oldest to latest
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
      appEvents.trigger('vue:right-toolbar:toggle', true);
    },
    updateDraftMessage: ({ commit }, newDraftMessage) => {
      commit(types.UPDATE_DRAFT_MESSAGE, newDraftMessage);
    },
    sendMessage: ({ state, commit, rootState }) => {
      const message = {
        text: state.draftMessage,
        parentId: state.parentId
      };
      const tmpId = `tmp-${Date.now()}`;
      const tmpMessage = {
        ...message,
        id: tmpId,
        fromUser: rootState.user
      };
      commit(rootTypes.ADD_TO_MESSAGE_MAP, [tmpMessage], { root: true });
      apiClient.room
        .post('/chatMessages', message)
        .then(message => {
          commit(rootTypes.REMOVE_FROM_MESSAGE_MAP, tmpId, { root: true });
          commit(rootTypes.ADD_TO_MESSAGE_MAP, [message], { root: true });
        })
        .catch(() => {
          commit(rootTypes.ADD_TO_MESSAGE_MAP, [{ ...tmpMessage, error: true }], { root: true });
        });
      commit(types.UPDATE_DRAFT_MESSAGE, '');
    },
    fetchChildMessages: ({ state, commit }) => {
      commit(types.REQUEST_CHILD_MESSAGES);
      apiClient.room
        .get(`/chatMessages/${state.parentId}/thread`)
        .then(childMessages => {
          commit(types.RESPONSE_CHILD_MESSAGES_SUCCESS);
          commit(rootTypes.ADD_TO_MESSAGE_MAP, childMessages, { root: true });
        })
        .catch((/* error */) => {
          // error is reported by apiClient
          commit(types.RESPONSE_CHILD_MESSAGES_ERROR);
        });
    }
  }
};
