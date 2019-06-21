'use strict';

const createState = require('../../../../public/js/vue/store/state').default;
const types = require('../../../../public/js/vue/store/mutation-types');

jest.mock('gitter-web-client-context');

const actions = require('../../../../public/js/vue/store/actions');
const testAction = require('./vuex-action-helper');
const context = require('gitter-web-client-context');
const appEvents = require('../../../../public/js/utils/appevents');

const { createSerializedRoomFixture } = require('../fixture-helpers');

describe('actions', () => {
  let state;
  beforeEach(() => {
    state = createState();
    context.troupe.mockReset();
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

  describe('setLeftMenuState', () => {
    it('sets the state', done => {
      const payload = 'people';
      testAction(
        actions.setLeftMenuState,
        payload,
        state,
        [{ type: types.SWITCH_LEFT_MENU_STATE, payload: payload }],
        [{ type: 'trackStat', payload: 'left-menu.minibar.activated.people' }],
        done
      );
    });

    it('when switching to search tab, re-searches for messages in the current room', done => {
      const payload = 'search';
      testAction(
        actions.setLeftMenuState,
        payload,
        state,
        [{ type: types.SWITCH_LEFT_MENU_STATE, payload: payload }],
        [
          { type: 'trackStat', payload: 'left-menu.minibar.activated.search' },
          { type: 'fetchMessageSearchResults' }
        ],
        done
      );
    });
  });

  it('toggleLeftMenuPinnedState', done => {
    const payload = false;
    testAction(
      actions.toggleLeftMenuPinnedState,
      payload,
      state,
      [{ type: types.TOGGLE_LEFT_MENU_PINNED_STATE, payload: payload }],
      [{ type: 'trackStat', payload: 'left-menu.pinned.false' }],
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

  describe('fetchRoomSearchResults', () => {
    it('action fired but no search input', done => {
      state.search.searchInputValue = '';

      testAction(
        actions.fetchRoomSearchResults,
        null,
        state,
        [{ type: types.SEARCH_CLEARED, payload: undefined }],
        [],
        done
      );
    });

    it.skip('searches value success', () => {});
    it.skip('searches value error', () => {});
  });

  describe('fetchMessageSearchResults', () => {
    it('action fired but no search input', done => {
      state.search.searchInputValue = '';

      testAction(actions.fetchMessageSearchResults, null, state, [], [], done);
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
          { type: types.RECEIVE_MESSAGE_SEARCH_SUCCESS, payload: null }
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
      const payload = '5cf8efbc4dfb4240048b768e';

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

    it('when router-chat loaded, fires appEvents to change rooms in the legacy part of the app', async () => {
      const roomObject = createSerializedRoomFixture('community/room1');

      context.troupe.mockImplementation(function() {
        return roomObject;
      });

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
        [{ type: 'trackStat', payload: 'left-menu.changeRoom' }]
      );

      await navigationEventFiredPromise;
      await vueChangeRoomEventFiredPromise;
    });

    it('when on non-router-chat page, just redirects the page', async () => {
      const roomObject = createSerializedRoomFixture('community/room1');

      state.roomMap[roomObject.id] = roomObject;

      window.location.assign = jest.fn();

      await testAction(
        actions.changeDisplayedRoom,
        roomObject.id,
        state,
        [{ type: types.CHANGE_DISPLAYED_ROOM, payload: roomObject.id }],
        [{ type: 'trackStat', payload: 'left-menu.changeRoom' }]
      );

      expect(window.location.assign).toHaveBeenCalledWith(roomObject.url);
    });
  });

  describe('jumpToMessageId', () => {
    it('updates highlighted message ID and sends off appevent for legacy chat view backbone to consume', async () => {
      const payload = '5cf8efbc4dfb4240048b768e';

      const vuehightLightedMessageIdEventFiredPromise = new Promise(resolve => {
        appEvents.on('vue:hightLightedMessageId', () => {
          resolve();
        });
      });

      await testAction(
        actions.jumpToMessageId,
        payload,
        state,
        [{ type: types.CHANGE_HIGHLIGHTED_MESSAGE_ID, payload: payload }],
        [{ type: 'trackStat', payload: 'left-menu.search.messageNavigate' }]
      );

      await vuehightLightedMessageIdEventFiredPromise;
    });
  });

  it('updateRoom', done => {
    const payload = { id: '5cf8efbc4dfb4240048b768e', unreads: 5 };
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
