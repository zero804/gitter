'use strict';

const createState = require('../../../../public/js/vue/store/state').default;
const types = require('../../../../public/js/vue/store/mutation-types');
const actions = require('../../../../public/js/vue/store/actions');
const testAction = require('./vuex-action-helper');
const appEvents = require('../../../../public/js/utils/appevents');

describe('actions', () => {
  let state;
  beforeEach(() => {
    state = createState();
  });

  it('setInitialData', done => {
    const payload = { a: 1, b: 2 };
    testAction(
      actions.setInitialData,
      payload,
      state,
      [{ type: types.SET_INITIAL_DATA, payload: payload }],
      [],
      done
    );
  });

  it('setTest', done => {
    const payload = 'newTestValue';
    testAction(
      actions.setTest,
      payload,
      state,
      [{ type: types.SET_TEST, payload: payload }],
      [],
      done
    );
  });

  it('setLeftMenuState', done => {
    const payload = 'people';
    testAction(
      actions.setLeftMenuState,
      payload,
      state,
      [{ type: types.SWITCH_LEFT_MENU_STATE, payload: payload }],
      [],
      done
    );
  });

  it('toggleLeftMenuPinnedState', done => {
    const payload = false;
    testAction(
      actions.toggleLeftMenuPinnedState,
      payload,
      state,
      [{ type: types.TOGGLE_LEFT_MENU_PINNED_STATE, payload: payload }],
      [],
      done
    );
  });

  it('toggleLeftMenu', done => {
    const payload = false;
    testAction(
      actions.toggleLeftMenu,
      payload,
      state,
      [{ type: types.TOGGLE_LEFT_MENU, payload: payload }],
      [],
      done
    );
  });

  it('updateSearchInputValue', done => {
    const payload = 'newSearchValue';
    testAction(
      actions.updateSearchInputValue,
      payload,
      state,
      [{ type: types.UPDATE_SEARCH_INPUT_VALUE, payload: payload }],
      [],
      done
    );
  });

  describe('fetchSearchResults', () => {
    it('action fired but no search input', done => {
      state.search.searchInputValue = '';

      testAction(actions.fetchSearchResults, null, state, [], [], done);
    });

    // FIXME: Waiting until we switch over to Axios for requests in the apiClient so we can mock
    it.skip('searches value success', done => {
      state.search.searchInputValue = 'search input value';

      // TODO: Stub request success

      testAction(
        actions.fetchSearchResults,
        null,
        state,
        [
          { type: types.REQUEST_MESSAGE_SEARCH },
          { type: types.RECEIVE_MESSAGE_SEARCH_SUCESS, payload: null }
        ],
        [],
        done
      );
    });

    // FIXME: Waiting until we switch over to Axios for requests in the apiClient so we can mock
    it.skip('searches value error', done => {
      state.search.searchInputValue = 'search input value';

      // TODO: Stub request error

      testAction(
        actions.fetchSearchResults,
        null,
        state,
        [
          { type: types.REQUEST_MESSAGE_SEARCH },
          { type: types.RECEIVE_MESSAGE_SEARCH_ERROR, payload: null }
        ],
        [],
        done
      );
    });
  });

  describe('changeDisplayedRoom', () => {
    it('room we do not know about will not send appEvents', async () => {
      const payload = 900009;

      let appEventTriggered = false;
      appEvents.once('*', () => {
        appEventTriggered = true;
      });

      await testAction(
        actions.changeDisplayedRoom,
        payload,
        state,
        [{ type: types.CHANGE_DISPLAYED_ROOM, payload: payload }],
        []
      );

      expect(appEventTriggered).toEqual(false);
    });

    it('fires appEvents to change rooms in the legacy part of the app', async () => {
      const roomObject = {
        id: 123456,
        uri: 'foo/bar',
        unreads: 4
      };

      state.roomMap[roomObject.id] = roomObject;

      const navigationEventFiredPromise = new Promise(resolve => {
        appEvents.on('navigation', () => {
          resolve();
        });
      });
      const vueChangeRoomEventFiredPromise = new Promise(resolve => {
        appEvents.on('vue:change:room', () => {
          resolve();
        });
      });

      await testAction(
        actions.changeDisplayedRoom,
        roomObject.id,
        state,
        [{ type: types.CHANGE_DISPLAYED_ROOM, payload: roomObject.id }],
        []
      );

      await navigationEventFiredPromise;
      await vueChangeRoomEventFiredPromise;
    });
  });

  it('updateRoom', done => {
    const payload = { id: 123456, unreads: 5 };
    testAction(
      actions.updateRoom,
      payload,
      state,
      [{ type: types.UPDATE_ROOM, payload: payload }],
      [],
      done
    );
  });
});
