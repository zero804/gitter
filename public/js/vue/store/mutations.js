import Vue from 'vue';
import * as types from './mutation-types';

export default {
  [types.SET_INITIAL_DATA](state, data) {
    Object.assign(state, data);
  },
  [types.SET_TEST](state, testValue) {
    state.test = testValue;
  },

  [types.SWITCH_LEFT_MENU_STATE](state, newLeftMenuState) {
    state.leftMenuState = newLeftMenuState;
  },
  [types.TOGGLE_LEFT_MENU_PINNED_STATE](state, newPinnedState) {
    state.leftMenuPinnedState = newPinnedState;
    // Always collapse when you unpinning
    // When the menu is pinned, the expanded state has no effect (always fully shown when pinned)
    state.leftMenuExpandedState = false;
  },
  [types.TOGGLE_LEFT_MENU](state, newToggleState) {
    state.leftMenuExpandedState = newToggleState;
  },

  [types.UPDATE_SEARCH_INPUT_VALUE](state, newSearchInputValue) {
    state.search.searchInputValue = newSearchInputValue;
  },
  [types.REQUEST_MESSAGE_SEARCH](state) {
    state.search.messageSearchError = false;
    state.search.messageSearchLoading = true;
  },
  [types.RECEIVE_MESSAGE_SEARCH_SUCESS](state, searchResults) {
    state.search.messageSearchError = false;
    state.search.messageSearchLoading = false;
    state.search.messageSearchResults = searchResults;
  },
  [types.RECEIVE_MESSAGE_SEARCH_ERROR](state) {
    state.search.messageSearchError = true;
    state.search.messageSearchLoading = false;
    state.search.messageSearchResults = [];
  },

  [types.CHANGE_DISPLAYED_ROOM](state, newRoomId) {
    state.displayedRoomId = newRoomId;
  },
  [types.UPDATE_ROOM](state, newRoomState) {
    if (newRoomState.id) {
      const resultantRoomState = Object.assign(
        {},
        state.roomMap[newRoomState.id] || {},
        newRoomState
      );
      Vue.set(state.roomMap, newRoomState.id, resultantRoomState);
    }
  }
};
