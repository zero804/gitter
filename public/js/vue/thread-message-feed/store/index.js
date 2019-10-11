import appEvents from '../../../utils/appevents';
import apiClient from '../../../components/api-client';
import moment from 'moment';
import composeQueryString from 'gitter-web-qs/compose';
import * as rootTypes from '../../store/mutation-types';
import VuexApiRequest from '../../store/vuex-api-request';
import { generateChildMessageTmpId } from '../../store/mutations';

const FETCH_MESSAGES_LIMIT = 50;

// Exported for testing
export const childMessagesVuexRequest = new VuexApiRequest(
  'CHILD_MESSAGES',
  'childMessagesRequest'
);

const canStartFetchingMessages = state =>
  !state.childMessagesRequest.loading && !state.childMessagesRequest.error;

/**
 * sets a prop on a message and after 5s sets
 * the same attribute to `undefined`
 * Used for notifying a chat-item component that it should react on an event
 */
const setTemporaryMessageProp = (commit, id, propName, propValue = true) => {
  commit(rootTypes.UPDATE_MESSAGE, { id, [propName]: propValue }, { root: true });
  setTimeout(
    () => commit(rootTypes.UPDATE_MESSAGE, { id, [propName]: propValue }, { root: true }),
    5000
  );
};
// Exported for testing
export const types = {
  TOGGLE_THREAD_MESSAGE_FEED: 'TOGGLE_THREAD_MESSAGE_FEED',
  SET_PARENT_MESSAGE_ID: 'SET_PARENT_MESSAGE_ID',
  UPDATE_DRAFT_MESSAGE: 'UPDATE_DRAFT_MESSAGE',
  SET_AT_TOP_IF_SAME_PARENT: 'SET_AT_TOP_IF_SAME_PARENT',
  SET_AT_BOTTOM_IF_SAME_PARENT: 'SET_AT_BOTTOM_IF_SAME_PARENT',
  RESET_THREAD_STATE: 'RESET_THREAD_STATE',
  ...childMessagesVuexRequest.types // just for completeness, the types are referenced as `childMessagesVuexRequest.successType`
};

export default {
  namespaced: true,
  state: () => ({
    isVisible: false,
    draftMessage: '',
    atTop: false,
    atBottom: false,
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
    [types.SET_AT_TOP_IF_SAME_PARENT](state, parentId) {
      // TMF parent changed during fetching, don't add a mark
      if (state.parentId !== parentId) return;
      state.atTop = true;
    },
    [types.SET_AT_BOTTOM_IF_SAME_PARENT](state, parentId) {
      // TMF parent changed during fetching, don't add a mark
      if (state.parentId !== parentId) return;
      state.atBottom = true;
    },
    [types.RESET_THREAD_STATE](state) {
      state.parentId = null;
      state.draftMessage = '';
      state.atTop = false;
      state.atBottom = false;
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
    open: ({ commit, dispatch, state }, parentId) => {
      if (state.isVisible && state.parentId === parentId) return;
      commit(types.RESET_THREAD_STATE);
      commit(types.TOGGLE_THREAD_MESSAGE_FEED, true);
      commit(types.SET_PARENT_MESSAGE_ID, parentId);
      appEvents.trigger('vue:right-toolbar:toggle', false);
      return dispatch('fetchInitialMessages');
    },
    close: ({ commit }) => {
      commit(types.TOGGLE_THREAD_MESSAGE_FEED, false);
      appEvents.trigger('vue:right-toolbar:toggle', true);
    },
    updateDraftMessage: ({ commit }, newDraftMessage) => {
      commit(types.UPDATE_DRAFT_MESSAGE, newDraftMessage);
    },
    sendMessage: ({ state, commit, dispatch, rootState }) => {
      const messagePayload = {
        text: state.draftMessage,
        parentId: state.parentId
      };
      const fromUser = rootState.user;
      const tmpMessage = {
        ...messagePayload,
        id: generateChildMessageTmpId(state.parentId, fromUser._id, state.draftMessage),
        fromUser,
        sent: new Date(Date.now())
      };
      commit(rootTypes.ADD_TO_MESSAGE_MAP, [{ ...tmpMessage, loading: true }], { root: true });
      apiClient.room
        .post('/chatMessages', messagePayload)
        .then(message => {
          // the message from the API response fully replaces the `tmpMessage` and because it
          // doesn't contain the `loading` attribute, UI will hide the loading indicator
          commit(rootTypes.ADD_TO_MESSAGE_MAP, [message], { root: true });
          dispatch('focusOnMessage', { id: message.id, block: 'end' });
        })
        .catch(() => {
          commit(rootTypes.ADD_TO_MESSAGE_MAP, [{ ...tmpMessage, error: true, loading: false }], {
            root: true
          });
        });
      commit(types.UPDATE_DRAFT_MESSAGE, '');
    },
    fetchChildMessages: (
      { state, commit },
      { beforeId, afterId, limit = FETCH_MESSAGES_LIMIT } = {}
    ) => {
      commit(childMessagesVuexRequest.requestType);
      const options = { beforeId, afterId, limit };
      return apiClient.room
        .get(`/chatMessages/${state.parentId}/thread${composeQueryString(options)}`)
        .then(childMessages => {
          commit(childMessagesVuexRequest.successType);
          commit(rootTypes.ADD_TO_MESSAGE_MAP, childMessages, { root: true });
          return childMessages;
        })
        .catch((/* error */) => {
          // error is reported by apiClient
          commit(childMessagesVuexRequest.errorType);
        });
    },
    /* opens TMF and highlights the permalinked child message */
    highlightChildMessage: ({ dispatch, commit }, { parentId, id }) => {
      dispatch('open', parentId).then(() => {
        setTemporaryMessageProp(commit, id, 'highlighted');
      });
    },
    /* used to scroll TMF down to the newest message, or to reposition TMF during infinite scroll
     * `block` is scrollIntoView block argument ('start', 'end', 'center', 'nearest')
     * https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollIntoView
     */
    focusOnMessage: ({ dispatch, commit, rootState }, { id, block }) => {
      const message = rootState.messageMap[id];
      if (!message) return;
      // this might be later conditional. If this is not child message, don't call open.
      dispatch('open', message.parentId).then(() => {
        commit(
          rootTypes.UPDATE_MESSAGE,
          { id, focusedAt: { block, timestamp: Date.now() } },
          { root: true }
        );
      });
    },
    fetchOlderMessages: ({ dispatch, state, getters, commit }) => {
      if (state.atTop || !canStartFetchingMessages(state)) return;
      if (!getters.childMessages.length) return;
      const parentIdBeforeFetch = state.parentId;
      dispatch('fetchChildMessages', { beforeId: getters.childMessages[0].id }).then(
        childMessages => {
          // align last message to the top (pushes the new messages just above the TMF viewport)
          dispatch('focusOnMessage', {
            id: childMessages[childMessages.length - 1].id,
            block: 'start'
          });
          if (childMessages.length < FETCH_MESSAGES_LIMIT)
            commit(types.SET_AT_TOP_IF_SAME_PARENT, parentIdBeforeFetch);
        }
      );
    },
    fetchNewerMessages: ({ dispatch, state, getters, commit }) => {
      if (state.atBottom || !canStartFetchingMessages(state)) return;
      const childMessages = getters.childMessages;
      if (!childMessages.length) return;
      const parentIdBeforeFetch = state.parentId;
      dispatch('fetchChildMessages', { afterId: childMessages[childMessages.length - 1].id }).then(
        childMessages => {
          // align last message to the bottom (pushes the new messages just below the TMF viewport)
          dispatch('focusOnMessage', { id: childMessages[0].id, block: 'end' });
          if (childMessages.length < FETCH_MESSAGES_LIMIT)
            commit(types.SET_AT_BOTTOM_IF_SAME_PARENT, parentIdBeforeFetch);
        }
      );
    },
    fetchInitialMessages: ({ dispatch, state, commit }) => {
      const parentIdBeforeFetch = state.parentId;
      return dispatch('fetchChildMessages').then(childMessages => {
        const lastMessage = childMessages[childMessages.length - 1];
        if (lastMessage) dispatch('focusOnMessage', { id: lastMessage.id, block: 'end' });
        commit(types.SET_AT_BOTTOM_IF_SAME_PARENT, parentIdBeforeFetch);
        if (childMessages.length < FETCH_MESSAGES_LIMIT) {
          commit(types.SET_AT_TOP_IF_SAME_PARENT, parentIdBeforeFetch);
        }
      });
    }
  }
};
