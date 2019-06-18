import * as types from './mutation-types';
import context from 'gitter-web-client-context';
import apiClient from '../../components/api-client';
import appEvents from '../../utils/appevents';
import * as leftMenuConstants from '../left-menu/constants';
import calculateFavouriteUpdates from 'gitter-web-rooms/lib/calculate-favourite-updates';

export const setInitialData = ({ commit }, data) => commit(types.SET_INITIAL_DATA, data);
export const setTest = ({ commit }, testValue) => commit(types.SET_TEST, testValue);

export const setLeftMenuState = ({ commit, dispatch }, newLeftMenuState) => {
  commit(types.SWITCH_LEFT_MENU_STATE, newLeftMenuState);

  // When we switch to the search panel, re-search for messages in that room
  if (newLeftMenuState === leftMenuConstants.LEFT_MENU_SEARCH_STATE) {
    dispatch('fetchMessageSearchResults');
  }
};

export const toggleLeftMenuPinnedState = ({ commit }, toggleState) =>
  commit(types.TOGGLE_LEFT_MENU_PINNED_STATE, toggleState);

export const toggleLeftMenu = ({ commit }, toggleState) =>
  commit(types.TOGGLE_LEFT_MENU, toggleState);

export const updatefavouriteDraggingInProgress = ({ commit }, toggleState) =>
  commit(types.UPDATE_FAVOURITE_DRAGGING_STATE, toggleState);

export const updateRoomFavourite = ({ state, commit, dispatch }, { id, favourite }) => {
  dispatch('updateRoom', {
    id,
    favourite
  });

  const roomIdFavouritePositionPairs = Object.values(state.roomMap).map(room => {
    return [room.id, room.favourite];
  });

  // After we update the item in question, we probably need to increment
  // subsequent items in the list so everything stays in order
  //
  // This shares the same logic on the backend for calculating the new favourite indexes
  const updates = calculateFavouriteUpdates(id, favourite, roomIdFavouritePositionPairs);
  updates.forEach(([id, favourite]) => {
    dispatch('updateRoom', {
      id,
      favourite
    });
  });

  commit(types.REQUEST_ROOM_FAVOURITE, id);
  apiClient.user
    .patch(`/rooms/${id}`, {
      favourite
    })
    .then(result => {
      commit(types.RECEIVE_ROOM_FAVOURITE_SUCCESS, result.id);
      dispatch('updateRoom', result);
    })
    .catch(err => {
      commit(types.RECEIVE_ROOM_FAVOURITE_ERROR, { id, error: err });
      appEvents.triggerParent('user_notification', {
        title: 'Error favouriting room',
        text: err.message
      });
    });
};

export const updateSearchInputValue = ({ commit }, newSearchInputValue) => {
  commit(types.UPDATE_SEARCH_INPUT_VALUE, newSearchInputValue);
};

export const fetchRoomSearchResults = ({ state, commit }) => {
  const searchInputValue = state.search.searchInputValue;

  if (searchInputValue && searchInputValue.length > 0) {
    commit(types.UPDATE_ROOM_SEARCH_CURRENT);

    commit(types.REQUEST_ROOM_SEARCH_REPO);
    apiClient.user
      .get('/repos', {
        q: searchInputValue,
        type: 'gitter',
        limit: 3
      })
      .then(result => {
        commit(types.RECEIVE_ROOM_SEARCH_REPO_SUCCESS, result && result.results);
      })
      .catch(err => {
        commit(types.RECEIVE_ROOM_SEARCH_REPO_ERROR, err);
      });

    commit(types.REQUEST_ROOM_SEARCH_ROOM);
    apiClient
      .get('/v1/rooms', {
        q: searchInputValue,
        type: 'gitter',
        limit: 3
      })
      .then(result => {
        commit(types.RECEIVE_ROOM_SEARCH_ROOM_SUCCESS, result && result.results);
      })
      .catch(err => {
        commit(types.RECEIVE_ROOM_SEARCH_ROOM_ERROR, err);
      });

    commit(types.REQUEST_ROOM_SEARCH_PEOPLE);
    apiClient
      .get('/v1/user', {
        q: searchInputValue,
        type: 'gitter',
        limit: 3
      })
      .then(result => {
        commit(types.RECEIVE_ROOM_SEARCH_PEOPLE_SUCCESS, result && result.results);
      })
      .catch(err => {
        commit(types.RECEIVE_ROOM_SEARCH_PEOPLE_ERROR, err);
      });
  } else {
    commit(types.SEARCH_CLEARED);
  }
};

export const fetchMessageSearchResults = ({ state, commit }) => {
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
