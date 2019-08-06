'use strict';

const createState = require('../../../../public/js/vue/store/state').default;
const types = require('../../../../public/js/vue/store/mutation-types');
const {
  roomSearchRepoRequest,
  roomSearchRoomRequest
} = require('../../../../public/js/vue/store/requests');
const mutations = require('../../../../public/js/vue/store/mutations').default;

const { createSerializedRoomFixture } = require('../fixture-helpers');

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

  it('TOGGLE_DARK_THEME', () => {
    const newValue = true;
    mutations[types.TOGGLE_DARK_THEME](state, newValue);
    expect(state.darkTheme).toEqual(newValue);
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

  it('UPDATE_FAVOURITE_DRAGGING_STATE', () => {
    const newValue = true;
    mutations[types.UPDATE_FAVOURITE_DRAGGING_STATE](state, newValue);
    expect(state.favouriteDraggingInProgress).toEqual(newValue);
  });

  describe('REQUEST_ROOM_FAVOURITE', () => {
    it('sets loading state', () => {
      const room1 = createSerializedRoomFixture('community/room1');
      state.roomMap = {
        [room1.id]: room1
      };

      mutations[types.REQUEST_ROOM_FAVOURITE](state, room1.id);
      expect(state.roomMap[room1.id].loading).toEqual(true);
    });

    it('clears error state', () => {
      const room1 = createSerializedRoomFixture('community/room1');
      state.roomMap = {
        [room1.id]: { ...room1, error: true }
      };

      expect(state.roomMap[room1.id].error).toEqual(true);

      mutations[types.REQUEST_ROOM_FAVOURITE](state, room1.id);
      expect(state.roomMap[room1.id].error).toEqual(false);
    });
  });

  describe('RECEIVE_ROOM_FAVOURITE_SUCCESS', () => {
    it('clears loading state', () => {
      const room1 = createSerializedRoomFixture('community/room1');
      state.roomMap = {
        [room1.id]: { ...room1, loading: true }
      };

      expect(state.roomMap[room1.id].loading).toEqual(true);

      mutations[types.RECEIVE_ROOM_FAVOURITE_SUCCESS](state, room1.id);
      expect(state.roomMap[room1.id].loading).toEqual(false);
    });

    it('clears error state', () => {
      const room1 = createSerializedRoomFixture('community/room1');
      state.roomMap = {
        [room1.id]: { ...room1, error: true }
      };

      expect(state.roomMap[room1.id].error).toEqual(true);

      mutations[types.RECEIVE_ROOM_FAVOURITE_SUCCESS](state, room1.id);
      expect(state.roomMap[room1.id].error).toEqual(false);
    });
  });

  it('RECEIVE_ROOM_FAVOURITE_ERROR ', () => {
    const room1 = createSerializedRoomFixture('community/room1');
    state.roomMap = {
      [room1.id]: { ...room1, loading: true }
    };

    expect(state.roomMap[room1.id].loading).toEqual(true);

    mutations[types.RECEIVE_ROOM_FAVOURITE_ERROR](state, { id: room1.id, error: true });
    expect(state.roomMap[room1.id].loading).toEqual(false);
    expect(state.roomMap[room1.id].error).toEqual(true);
  });

  describe('Search', () => {
    function generateSearchTests(
      type,
      requestType,
      receiveSuccessType,
      recieveErrorType,
      searchKey
    ) {
      describe(`${type}`, () => {
        describe(`${requestType}`, () => {
          beforeEach(() => {
            state.search[searchKey].error = true;
            state.search[searchKey].loading = true;

            mutations[requestType](state);
          });

          it('clears error state', () => {
            expect(state.search[searchKey].error).toEqual(false);
          });

          it('sets loading state', () => {
            expect(state.search[searchKey].loading).toEqual(true);
          });
        });

        describe(`${receiveSuccessType}`, () => {
          const searchResults = [1, 2];
          beforeEach(() => {
            mutations[receiveSuccessType](state, searchResults);
          });

          it('clears error state', () => {
            expect(state.search[searchKey].error).toEqual(false);
          });

          it('clears loading state', () => {
            expect(state.search[searchKey].loading).toEqual(false);
          });

          it('sets search results', () => {
            expect(state.search[searchKey].results).toEqual(searchResults);
          });
        });

        describe(`${recieveErrorType}`, () => {
          beforeEach(() => {
            mutations[recieveErrorType](state);
          });

          it('sets error state', () => {
            expect(state.search[searchKey].error).toEqual(true);
          });

          it('clears loading state', () => {
            expect(state.search[searchKey].loading).toEqual(false);
          });

          it('clears search results', () => {
            expect(state.search[searchKey].results).toEqual([]);
          });
        });
      });
    }

    it('UPDATE_SEARCH_INPUT_VALUE', () => {
      const newValue = 'newTestValue';
      mutations[types.UPDATE_SEARCH_INPUT_VALUE](state, newValue);
      expect(state.search.searchInputValue).toEqual(newValue);
    });

    it('SEARCH_CLEARED', () => {
      state.search.current = { results: [123] };
      state.search.repo = { loading: true, error: true, results: [123] };
      state.search.room = { loading: true, error: true, results: [123] };
      state.search.people = { loading: true, error: true, results: [123] };
      state.search.message = { loading: true, error: true, results: [123] };

      mutations[types.SEARCH_CLEARED](state);
      expect(state.search.current.results).toEqual([]);

      expect(state.search.repo).toEqual({ loading: false, error: false, results: [] });
      expect(state.search.room).toEqual({ loading: false, error: false, results: [] });
      expect(state.search.people).toEqual({ loading: false, error: false, results: [] });
      expect(state.search.message).toEqual({ loading: false, error: false, results: [] });
    });

    describe('Room search', () => {
      describe('UPDATE_ROOM_SEARCH_CURRENT', () => {
        it('searching nothing, finds nothing', () => {
          state.search.searchInputValue = '';

          const room1 = createSerializedRoomFixture('community/special-room1');
          state.roomMap = {
            [room1.id]: room1
          };

          mutations[types.UPDATE_ROOM_SEARCH_CURRENT](state);
          expect(state.search.current.results).toEqual([]);
        });

        it('searching for room, finds room', () => {
          state.search.searchInputValue = 'special';

          const room1 = createSerializedRoomFixture('community/special-room1');
          state.roomMap = {
            [room1.id]: room1
          };

          mutations[types.UPDATE_ROOM_SEARCH_CURRENT](state);
          expect(state.search.current.results).toEqual([room1.id]);
        });

        it('searching for some other room not in your list, finds nothing', () => {
          state.search.searchInputValue = 'not-in-my-room-list';

          const room1 = createSerializedRoomFixture('community/special-room1');
          state.roomMap = {
            [room1.id]: room1
          };

          mutations[types.UPDATE_ROOM_SEARCH_CURRENT](state);
          expect(state.search.current.results).toEqual([]);
        });
      });

      generateSearchTests(
        'Repo',
        roomSearchRepoRequest.requestType,
        roomSearchRepoRequest.successType,
        roomSearchRepoRequest.errorType,
        'repo'
      );

      generateSearchTests(
        'Room',
        roomSearchRoomRequest.requestType,
        roomSearchRoomRequest.successType,
        roomSearchRoomRequest.errorType,
        'room'
      );

      generateSearchTests(
        'People',
        types.REQUEST_ROOM_SEARCH_PEOPLE,
        types.RECEIVE_ROOM_SEARCH_PEOPLE_SUCCESS,
        types.RECEIVE_ROOM_SEARCH_PEOPLE_ERROR,
        'people'
      );
    });

    describe('Message search', () => {
      generateSearchTests(
        'People',
        types.REQUEST_MESSAGE_SEARCH,
        types.RECEIVE_MESSAGE_SEARCH_SUCCESS,
        types.RECEIVE_MESSAGE_SEARCH_ERROR,
        'message'
      );
    });
  });

  describe('CHANGE_DISPLAYED_ROOM', () => {
    it('changed displayed room', () => {
      const newRoomId = '123456';
      mutations[types.CHANGE_DISPLAYED_ROOM](state, newRoomId);
      expect(state.displayedRoomId).toEqual(newRoomId);
    });

    it('clears highlighted message', () => {
      const messageId = '5c1234';
      state.hightLightedMessageId = messageId;
      expect(state.hightLightedMessageId).toBeDefined();

      mutations[types.CHANGE_DISPLAYED_ROOM](state, '123456');
      expect(state.hightLightedMessageId).toEqual(null);
    });
  });

  it('CHANGE_HIGHLIGHTED_MESSAGE_ID', () => {
    const newMessageId = '5c1234';
    mutations[types.CHANGE_HIGHLIGHTED_MESSAGE_ID](state, newMessageId);
    expect(state.hightLightedMessageId).toEqual(newMessageId);
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
