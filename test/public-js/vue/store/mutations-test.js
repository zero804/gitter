'use strict';

const createState = require('../../../../public/js/vue/store/state').default;
const types = require('../../../../public/js/vue/store/mutation-types');
const mutations = require('../../../../public/js/vue/store/mutations').default;

describe('mutations', () => {
  let state;
  beforeEach(() => {
    state = createState();
  });

  it('SET_INITIAL_DATA adds/updates all keys in payload', () => {
    const newValue = 'newTestValue';
    mutations[types.SET_INITIAL_DATA](state, { test: newValue, a: 1, b: 2 });
    expect(state.test).toEqual(newValue);
    expect(state.a).toEqual(1);
    expect(state.b).toEqual(2);
  });

  it('SET_TEST', () => {
    const newValue = 'newTestValue';
    mutations[types.SET_TEST](state, newValue);
    expect(state.test).toEqual(newValue);
  });

  it('SWITCH_LEFT_MENU_STATE', () => {
    const newValue = 'newTestValue';
    mutations[types.SWITCH_LEFT_MENU_STATE](state, newValue);
    expect(state.leftMenuState).toEqual(newValue);
  });

  describe('TOGGLE_LEFT_MENU_PINNED_STATE', () => {
    it('unpinning left menu will collapse menu', () => {
      state.leftMenuPinnedState = true;
      state.leftMenuExpandedState = true;
      expect(state.leftMenuPinnedState).toEqual(true);
      expect(state.leftMenuExpandedState).toEqual(true);

      mutations[types.TOGGLE_LEFT_MENU_PINNED_STATE](state, false);

      expect(state.leftMenuPinnedState).toEqual(false);
      expect(state.leftMenuExpandedState).toEqual(false);
    });

    it('pinning left menu', () => {
      state.leftMenuPinnedState = false;
      state.leftMenuExpandedState = false;
      expect(state.leftMenuPinnedState).toEqual(false);
      expect(state.leftMenuExpandedState).toEqual(false);

      mutations[types.TOGGLE_LEFT_MENU_PINNED_STATE](state, true);

      expect(state.leftMenuPinnedState).toEqual(true);
      expect(state.leftMenuExpandedState).toEqual(false);
    });
  });

  describe('TOGGLE_LEFT_MENU', () => {
    it('collapsing left menu', () => {
      state.leftMenuExpandedState = true;
      expect(state.leftMenuExpandedState).toEqual(true);

      mutations[types.TOGGLE_LEFT_MENU](state, false);

      expect(state.leftMenuExpandedState).toEqual(false);
    });

    it('expanding left menu', () => {
      state.leftMenuExpandedState = false;
      expect(state.leftMenuExpandedState).toEqual(false);

      mutations[types.TOGGLE_LEFT_MENU](state, true);

      expect(state.leftMenuExpandedState).toEqual(true);
    });
  });

  it('UPDATE_SEARCH_INPUT_VALUE', () => {
    const newValue = 'newTestValue';
    mutations[types.UPDATE_SEARCH_INPUT_VALUE](state, newValue);
    expect(state.search.searchInputValue).toEqual(newValue);
  });

  describe('RECEIVE_MESSAGE_SEARCH_SUCESS', () => {
    const searchResults = [1, 2];
    beforeEach(() => {
      mutations[types.RECEIVE_MESSAGE_SEARCH_SUCESS](state, searchResults);
    });

    it('clears error state', () => {
      expect(state.search.messageSearchError).toEqual(false);
    });

    it('clears loading state', () => {
      expect(state.search.messageSearchLoading).toEqual(false);
    });

    it('sets search results', () => {
      expect(state.search.messageSearchResults).toEqual(searchResults);
    });
  });

  describe('RECEIVE_MESSAGE_SEARCH_ERROR', () => {
    beforeEach(() => {
      mutations[types.RECEIVE_MESSAGE_SEARCH_ERROR](state);
    });

    it('sets error state', () => {
      expect(state.search.messageSearchError).toEqual(true);
    });

    it('clears loading state', () => {
      expect(state.search.messageSearchLoading).toEqual(false);
    });

    it('clears search results', () => {
      expect(state.search.messageSearchResults).toEqual([]);
    });
  });

  it('CHANGE_DISPLAYED_ROOM', () => {
    const newRoomId = 123456;
    mutations[types.CHANGE_DISPLAYED_ROOM](state, newRoomId);
    expect(state.displayedRoomId).toEqual(newRoomId);
  });

  describe('UPDATE_ROOM', () => {
    it('adds new room to the roomMap', () => {
      const roomObject = {
        id: 123,
        uri: 'foo/bar'
      };
      mutations[types.UPDATE_ROOM](state, roomObject);
      expect(state.roomMap[123]).toEqual(roomObject);
    });

    it('updates existing room in roomMap', () => {
      const roomObject = {
        id: 123,
        uri: 'foo/bar',
        unreads: 4
      };

      state.roomMap[roomObject.id] = roomObject;

      const newRoomObject = {
        ...roomObject,
        unreads: 10
      };

      mutations[types.UPDATE_ROOM](state, newRoomObject);
      expect(state.roomMap[123]).toEqual(newRoomObject);
    });
  });
});
