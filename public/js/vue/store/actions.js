import * as types from './mutation-types';
import context from 'gitter-web-client-context';
import apiClient from '../../components/api-client';
import appEvents from '../../utils/appevents';

export const setInitialData = ({ commit }, data) => commit(types.SET_INITIAL_DATA, data);
export const setTest = ({ commit }, testValue) => commit(types.SET_TEST, testValue);

export const setLeftMenuState = ({ commit }, newLeftMenuState) =>
  commit(types.SWITCH_LEFT_MENU_STATE, newLeftMenuState);

export const toggleLeftMenuPinnedState = ({ commit }, toggleState) =>
  commit(types.TOGGLE_LEFT_MENU_PINNED_STATE, toggleState);

export const toggleLeftMenu = ({ commit }, toggleState) =>
  commit(types.TOGGLE_LEFT_MENU, toggleState);

export const updateSearchInputValue = ({ commit }, newSearchInputValue) => {
  commit(types.UPDATE_SEARCH_INPUT_VALUE, newSearchInputValue);
};

export const fetchSearchResults = ({ state, commit }) => {
  const searchInputValue = state.search.searchInputValue;

  if (searchInputValue && searchInputValue.length > 0) {
    commit(types.REQUEST_MESSAGE_SEARCH);
    apiClient.room
      .get('/chatMessages', {
        q: searchInputValue,
        lang: context.lang(),
        limit: 30
      })
      .then(result => {
        commit(types.RECEIVE_MESSAGE_SEARCH_SUCCESS, result);
      })
      .catch(err => {
        commit(types.RECEIVE_MESSAGE_SEARCH_ERROR, err);
      });
  }
};

export const changeDisplayedRoom = ({ state, commit }, newRoomId) => {
  commit(types.CHANGE_DISPLAYED_ROOM, newRoomId);

  const newRoom = state.roomMap[newRoomId];

  if (newRoom) {
    // If there is a current room, it means that the router-chat routing is in place to switch to other rooms
    const currentRoom = context.troupe();
    if (currentRoom && currentRoom.id) {
      appEvents.trigger('navigation', newRoom.url, 'chat', newRoom.name);
      appEvents.trigger('vue:change:room', newRoom);
    } else {
      // Otherwise, we need to redirect
      // We are using `window.location.assign` so we can easily mock/spy in the tests
      window.location.assign(newRoom.url);
    }
  }
};

export const jumpToMessageId = ({ commit }, messageId) => {
  commit(types.CHANGE_HIGHLIGHTED_MESSAGE_ID, messageId);
  appEvents.trigger('vue:hightLightedMessageId', messageId);
};

export const updateRoom = ({ commit }, newRoomState) => commit(types.UPDATE_ROOM, newRoomState);
