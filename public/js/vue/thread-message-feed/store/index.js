import appEvents from '../../../utils/appevents';
import apiClient from '../../../components/api-client';
import moment from 'moment';
import * as rootTypes from '../../store/mutation-types';
import VuexApiRequest from '../../store/vuex-api-request';

// Exported for testing
export const childMessagesVuexRequest = new VuexApiRequest(
  'CHILD_MESSAGES',
  'childMessagesRequest'
);

// Exported for testing
export const types = {
  TOGGLE_THREAD_MESSAGE_FEED: 'TOGGLE_THREAD_MESSAGE_FEED',
  SET_PARENT_MESSAGE_ID: 'SET_PARENT_MESSAGE_ID',
  UPDATE_DRAFT_MESSAGE: 'UPDATE_DRAFT_MESSAGE',
  ...childMessagesVuexRequest.types // just for completeness, the types are referenced as `childMessagesVuexRequest.successType`
};

export default {
  namespaced: true,
  state: () => ({
    isVisible: false,
    draftMessage: '',
    parentId: null,
    ...childMessagesVuexRequest.initialState
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
    ...childMessagesVuexRequest.mutations
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
      // we use moment because the messages combine messages from bayeux and ordinary json messages (fetch during TMF open)
      return childMessages.sort((m1, m2) => moment(m1.sent).diff(m2.sent)); // sort from oldest to latest
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
      const messagePayload = {
        text: state.draftMessage,
        parentId: state.parentId
      };
      const timestamp = Date.now();
      const tmpId = `tmp-${timestamp}`;
      const tmpMessage = {
        ...messagePayload,
        id: tmpId,
        fromUser: rootState.user,
        sent: new Date(timestamp)
      };
      commit(rootTypes.ADD_TO_MESSAGE_MAP, [tmpMessage], { root: true });
      apiClient.room
        .post('/chatMessages', messagePayload)
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
      commit(childMessagesVuexRequest.requestType);
      apiClient.room
        .get(`/chatMessages/${state.parentId}/thread`)
        .then(childMessages => {
          commit(childMessagesVuexRequest.successType);
          commit(rootTypes.ADD_TO_MESSAGE_MAP, childMessages, { root: true });
        })
        .catch((/* error */) => {
          // error is reported by apiClient
          commit(childMessagesVuexRequest.errorType);
        });
    }
  }
};
