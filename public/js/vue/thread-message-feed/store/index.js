import appEvents from '../../../utils/appevents';
import apiClient from '../../../components/api-client';
import VuexApiRequest from '../../store/vuex-api-request';
import * as moment from 'moment';
import * as _ from 'lodash';

// Exported for testing
export const childMessagesVuexRequest = new VuexApiRequest('CHILD_MESSAGES', 'childMessages');

// Exported for testing
export const types = {
  TOGGLE_THREAD_MESSAGE_FEED: 'TOGGLE_THREAD_MESSAGE_FEED',
  SET_PARENT_MESSAGE_ID: 'SET_PARENT_MESSAGE_ID',
  UPDATE_DRAFT_MESSAGE: 'UPDATE_DRAFT_MESSAGE',
  REQUEST_SEND_CHILD_MESSAGE: 'REQUEST_SEND_CHILD_MESSAGE',
  RESPONSE_SEND_CHILD_MESSAGE_SUCCESS: 'RESPONSE_SEND_CHILD_MESSAGE_SUCCESS',
  RESPONSE_SEND_CHILD_MESSAGE_ERROR: 'RESPONSE_SEND_CHILD_MESSAGE_ERROR',
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
    [types.REQUEST_SEND_CHILD_MESSAGE](state, { tmpMessage }) {
      state.childMessages.results.push(tmpMessage);
    },
    [types.RESPONSE_SEND_CHILD_MESSAGE_SUCCESS](state, { tmpId, message }) {
      const updatedResults = state.childMessages.results.filter(message => message.id !== tmpId);
      updatedResults.push(message);
      state.childMessages.results = updatedResults;
    },
    [types.RESPONSE_SEND_CHILD_MESSAGE_ERROR](state, { tmpId }) {
      const updatedResults = state.childMessages.results.map(message => {
        if (message.id === tmpId) {
          return { ...message, error: true };
        } else {
          return message;
        }
      });
      state.childMessages.results = updatedResults;
    },
    ...childMessagesVuexRequest.mutations
  },
  getters: {
    parentMessage: (state, getters, rootState) => {
      return rootState.messageMap[state.parentId];
    },
    childMessages: (state, getters, rootState) => {
      const { parentId } = state;
      const updates = Object.values(rootState.messageMap).filter(m => m.parentId === parentId);
      const allChildMessages = [...updates, ...state.childMessages.results];
      const uniqueMessages = _.uniq(allChildMessages, false, 'id');
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
      commit(childMessagesVuexRequest.successType, []);
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
      const tmpId = `tmp-${new Date().getTime()}`;
      const tmpMessage = {
        ...message,
        id: tmpId,
        fromUser: rootState.user
      };
      commit(types.REQUEST_SEND_CHILD_MESSAGE, { tmpMessage });
      apiClient.room
        .post('/chatMessages', message)
        .then(message => commit(types.RESPONSE_SEND_CHILD_MESSAGE_SUCCESS, { tmpId, message }))
        .catch(() => commit(types.RESPONSE_SEND_CHILD_MESSAGE_ERROR, { tmpId }));
      commit(types.UPDATE_DRAFT_MESSAGE, '');
    },
    fetchChildMessages: ({ state, commit }) => {
      commit(childMessagesVuexRequest.requestType);
      apiClient.room
        .get(`/chatMessages/${state.parentId}/thread`)
        .then(childMessages => commit(childMessagesVuexRequest.successType, childMessages))
        .catch((/* error */) => {
          // error is reported by apiClient
          commit(childMessagesVuexRequest.errorType);
        });
    }
  }
};
