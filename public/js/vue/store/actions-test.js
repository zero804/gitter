const _ = require('lodash');
const createState = require('./state').default;
const types = require('./mutation-types');
const {
  roomSearchRepoRequest,
  roomSearchRoomRequest,
  roomSearchPeopleRequest,
  messageSearchRequest
} = require('../../../../public/js/vue/store/requests');

jest.mock('gitter-web-client-context');
jest.mock('../../utils/appevents', () => {
  return {
    ...require.requireActual('../../utils/appevents'),
    triggerParent: jest.fn()
  };
});
jest.mock('../../components/api-client');

const actions = require('./actions');
const testAction = require('./__test__/vuex-action-helper');
const context = require('gitter-web-client-context');
const appEvents = require('../../utils/appevents');
const apiClient = require('../../components/api-client');

const { createSerializedRoomFixture } = require('../__test__/fixture-helpers');

const REPO_SEARCH_RESPONSE = [
  {
    id: 34833775,
    name: 'MadLittleMods/postcss-css-variables',
    description:
      'PostCSS plugin to transform CSS Custom Properties(CSS variables) syntax into a static representation',
    uri: 'MadLittleMods/postcss-css-variables',
    private: false,
    room: {
      id: '55c0b4f60fc9f982beac26ca',
      name: 'MadLittleMods/postcss-css-variables',
      topic:
        'PostCSS plugin to transform CSS Custom Properties(CSS variables) syntax into a static representation',
      avatarUrl: 'https://avatars-01.gitter.im/group/iv/3/57542c89c43b8c601977426d',
      uri: 'MadLittleMods/postcss-css-variables',
      oneToOne: false,
      userCount: 10,
      unreadItems: 0,
      mentions: 0,
      lastAccessTime: '2019-02-07T21:58:57.238Z',
      lurk: false,
      url: '/MadLittleMods/postcss-css-variables',
      githubType: 'REPO',
      security: 'PUBLIC',
      noindex: false,
      roomMember: true,
      groupId: '57542c89c43b8c601977426d',
      public: true
    },
    exists: true,
    avatar_url: 'https://avatars3.githubusercontent.com/u/558581?v=4'
  },
  {
    id: 39976492,
    name: 'MadLittleMods/postcss-increase-specificity',
    description:
      "Why? Dealing with CSS you can't remove(mainly from a 3rd party). Increases specificity of selectors.",
    uri: 'MadLittleMods/postcss-increase-specificity',
    private: false,
    exists: false,
    avatar_url: 'https://avatars3.githubusercontent.com/u/558581?v=4'
  },
  {
    id: 41282211,
    name: 'MadLittleMods/postcss-presentation',
    description: 'PostCSS presentation to introduce PostCSS to my coworkers',
    uri: 'MadLittleMods/postcss-presentation',
    private: false,
    exists: false,
    avatar_url: 'https://avatars3.githubusercontent.com/u/558581?v=4'
  }
];

describe('actions', () => {
  let state;
  beforeEach(() => {
    state = createState();
    context.troupe.mockReset();
    apiClient.user.get.mockReset();
    apiClient.get.mockReset();
    apiClient.user.patch.mockReset();
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

  describe('toggleDarkTheme', () => {
    it('sets the state', done => {
      const payload = true;
      testAction(
        actions.toggleDarkTheme,
        payload,
        state,
        [{ type: types.TOGGLE_DARK_THEME, payload: payload }],
        [],
        done
      );
    });
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
      [{ type: 'trackStat', payload: `left-menu.toggle.${payload}` }],
      done
    );
  });

  it('updatefavouriteDraggingInProgress', done => {
    const payload = true;
    testAction(
      actions.updatefavouriteDraggingInProgress,
      payload,
      state,
      [{ type: types.UPDATE_FAVOURITE_DRAGGING_STATE, payload: payload }],
      [],
      done
    );
  });

  describe('_localUpdateRoomFavourite', () => {
    it('updates lone room to favourite', done => {
      const room1 = createSerializedRoomFixture('community/room1');

      state.roomMap[room1.id] = room1;

      const payload = { id: room1.id, favourite: 1 };
      testAction(
        actions._localUpdateRoomFavourite,
        payload,
        state,
        [],
        [{ type: 'upsertRoom', payload }],
        done
      );
    });

    it('updates subsequent favourites', done => {
      const favouriteRoom1 = {
        ...createSerializedRoomFixture('community/favourite-room1'),
        favourite: 1
      };
      const favouriteRoom2 = {
        ...createSerializedRoomFixture('community/favourite-room2'),
        favourite: 2
      };
      const favouriteRoom3 = {
        ...createSerializedRoomFixture('community/favourite-room3'),
        favourite: 3
      };
      const room1 = createSerializedRoomFixture('community/room1');

      state.roomMap = {
        [favouriteRoom1.id]: favouriteRoom1,
        [favouriteRoom2.id]: favouriteRoom2,
        [favouriteRoom3.id]: favouriteRoom3,
        [room1.id]: room1
      };

      const payload = { id: room1.id, favourite: 1 };
      testAction(
        actions._localUpdateRoomFavourite,
        payload,
        state,
        [],
        [
          { type: 'upsertRoom', payload },
          { type: 'upsertRoom', payload: { id: favouriteRoom1.id, favourite: 2 } },
          { type: 'upsertRoom', payload: { id: favouriteRoom2.id, favourite: 3 } },
          { type: 'upsertRoom', payload: { id: favouriteRoom3.id, favourite: 4 } }
        ],
        done
      );
    });
  });

  describe('updateRoomFavourite', () => {
    it('updates lone room to favourite', done => {
      const room1 = createSerializedRoomFixture('community/room1');

      state.roomMap[room1.id] = room1;

      const payload = { id: room1.id, favourite: 1 };

      const updatedRoom1 = {
        ...room1,
        ...payload
      };
      apiClient.user.patch.mockImplementation(() => Promise.resolve(updatedRoom1));

      testAction(
        actions.updateRoomFavourite,
        payload,
        state,
        [
          { type: types.REQUEST_ROOM_FAVOURITE, payload: room1.id },
          { type: types.RECEIVE_ROOM_FAVOURITE_SUCCESS, payload: room1.id }
        ],
        [
          { type: '_localUpdateRoomFavourite', payload },
          { type: 'upsertRoom', payload: updatedRoom1 }
        ],
        done
      );
    });

    it('rollsback favourite on error', done => {
      const room1 = createSerializedRoomFixture('community/room1');

      state.roomMap[room1.id] = room1;

      apiClient.user.patch.mockImplementation(() => Promise.reject(true));

      const payload = { id: room1.id, favourite: 1 };
      testAction(
        actions.updateRoomFavourite,
        payload,
        state,
        [
          { type: types.REQUEST_ROOM_FAVOURITE, payload: room1.id },
          { type: types.RECEIVE_ROOM_FAVOURITE_ERROR, payload: { id: room1.id, error: true } }
        ],
        [
          { type: '_localUpdateRoomFavourite', payload },
          { type: '_localUpdateRoomFavourite', payload: { id: room1.id, favourite: undefined } }
        ],
        done
      );
    });

    it('rollsback favourite move up on error', done => {
      const favouriteRoom1 = {
        ...createSerializedRoomFixture('community/favourite-room1'),
        favourite: 5
      };

      state.roomMap[favouriteRoom1.id] = favouriteRoom1;

      apiClient.user.patch.mockImplementation(() => Promise.reject(true));

      const payload = { id: favouriteRoom1.id, favourite: 1 };
      testAction(
        actions.updateRoomFavourite,
        payload,
        state,
        [
          { type: types.REQUEST_ROOM_FAVOURITE, payload: favouriteRoom1.id },
          {
            type: types.RECEIVE_ROOM_FAVOURITE_ERROR,
            payload: { id: favouriteRoom1.id, error: true }
          }
        ],
        [
          { type: '_localUpdateRoomFavourite', payload },
          {
            type: '_localUpdateRoomFavourite',
            // We need to increment by 1 because the itemBeingMoved already moved and is taking up space
            // so we want to get the new index that represents where the itemBeingMoved was before
            payload: { id: favouriteRoom1.id, favourite: favouriteRoom1.favourite + 1 }
          }
        ],
        done
      );
    });

    it('rollsback favourite move down on error', done => {
      const favouriteRoom1 = {
        ...createSerializedRoomFixture('community/favourite-room1'),
        favourite: 1
      };

      state.roomMap[favouriteRoom1.id] = favouriteRoom1;

      apiClient.user.patch.mockImplementation(() => Promise.reject(true));

      const payload = { id: favouriteRoom1.id, favourite: 5 };
      testAction(
        actions.updateRoomFavourite,
        payload,
        state,
        [
          { type: types.REQUEST_ROOM_FAVOURITE, payload: favouriteRoom1.id },
          {
            type: types.RECEIVE_ROOM_FAVOURITE_ERROR,
            payload: { id: favouriteRoom1.id, error: true }
          }
        ],
        [
          { type: '_localUpdateRoomFavourite', payload },
          {
            type: '_localUpdateRoomFavourite',
            payload: { id: favouriteRoom1.id, favourite: favouriteRoom1.favourite }
          }
        ],
        done
      );
    });
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

    it('room searches succeeds with some results', done => {
      state.search.searchInputValue = 'special';

      const roomResult1 = _.omit(createSerializedRoomFixture('community/not-joined1'), [
        'lastAccessTime',
        'roomMember'
      ]);

      const oneToOneResult1 = {
        avatarUrl: 'https://avatars-04.gitter.im/gh/uv/4/JORGE-ASDF',
        avatarUrlMedium: 'https://avatars2.githubusercontent.com/u/51345323?v=4&s=128',
        avatarUrlSmall: 'https://avatars2.githubusercontent.com/u/51345323?v=4&s=60',
        displayName: 'some-buddy1',
        gv: '4',
        id: '5cf6a2f5d72222ce4fc22a22',
        url: '/some-buddy1',
        username: 'some-buddy1',
        v: 1
      };

      apiClient.user.get.mockImplementation(() => Promise.resolve({ results: [] }));
      apiClient.get.mockImplementation(endpoint => {
        if (endpoint === '/v1/rooms') {
          return Promise.resolve({ results: [roomResult1] });
        } else if (endpoint === '/v1/user') {
          return Promise.resolve({ results: [oneToOneResult1] });
        }
      });

      testAction(
        actions.fetchRoomSearchResults,
        null,
        state,
        [
          { type: types.UPDATE_ROOM_SEARCH_CURRENT },
          { type: roomSearchRepoRequest.requestType },
          { type: roomSearchRoomRequest.requestType },
          { type: roomSearchPeopleRequest.requestType },
          { type: roomSearchRepoRequest.successType, payload: [] },
          { type: roomSearchRoomRequest.successType, payload: [roomResult1.id] },
          { type: roomSearchPeopleRequest.successType, payload: [oneToOneResult1.id] }
        ],
        [
          { type: 'trackStat', payload: 'left-menu.search.input' },
          { type: 'upsertRoom', payload: roomResult1 },
          { type: 'upsertRoom', payload: oneToOneResult1 }
        ],
        done
      );
    });

    it('repo searches succeeds with some results', done => {
      state.search.searchInputValue = 'postcss';

      apiClient.user.get.mockImplementation(() =>
        Promise.resolve({ results: REPO_SEARCH_RESPONSE })
      );
      apiClient.get.mockImplementation(() => Promise.resolve({ results: [] }));

      testAction(
        actions.fetchRoomSearchResults,
        null,
        state,
        [
          { type: types.UPDATE_ROOM_SEARCH_CURRENT },
          { type: roomSearchRepoRequest.requestType },
          { type: roomSearchRoomRequest.requestType },
          { type: roomSearchPeopleRequest.requestType },
          {
            type: roomSearchRepoRequest.successType,
            payload: [REPO_SEARCH_RESPONSE[0].room.id]
          },
          { type: roomSearchRoomRequest.successType, payload: [] },
          { type: roomSearchPeopleRequest.successType, payload: [] }
        ],
        [
          { type: 'trackStat', payload: 'left-menu.search.input' },
          { type: 'upsertRoom', payload: REPO_SEARCH_RESPONSE[0].room }
        ],
        done
      );
    });

    it('searches value error', done => {
      state.search.searchInputValue = 'special';

      apiClient.user.get.mockImplementation(() => Promise.reject(true));
      apiClient.get.mockImplementation(() => Promise.reject(true));

      testAction(
        actions.fetchRoomSearchResults,
        null,
        state,
        [
          { type: types.UPDATE_ROOM_SEARCH_CURRENT },
          { type: roomSearchRepoRequest.requestType },
          { type: roomSearchRoomRequest.requestType },
          { type: roomSearchPeopleRequest.requestType },
          { type: roomSearchRepoRequest.errorType, payload: true },
          { type: roomSearchRoomRequest.errorType, payload: true },
          { type: roomSearchPeopleRequest.errorType, payload: true }
        ],
        [{ type: 'trackStat', payload: 'left-menu.search.input' }],
        done
      );
    });
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
          { type: messageSearchRequest.requestType },
          { type: messageSearchRequest.successType, payload: null }
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
          { type: messageSearchRequest.requestType },
          { type: messageSearchRequest.errorType, payload: null }
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
        [{ type: 'threadMessageFeed/close', payload: undefined }]
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
        [
          { type: 'threadMessageFeed/close', payload: undefined },
          { type: 'trackStat', payload: 'left-menu.changeRoom' }
        ]
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
        [
          { type: 'threadMessageFeed/close', payload: undefined },
          { type: 'trackStat', payload: 'left-menu.changeRoom' }
        ]
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

  it('upsertRoom', done => {
    const payload = { id: '5cf8efbc4dfb4240048b768e', unreads: 5 };
    testAction(
      actions.upsertRoom,
      payload,
      state,
      [{ type: types.UPDATE_ROOM, payload: payload }],
      [],
      done
    );
  });

  it('addMessages', async () => {
    const message1 = { id: '5cf8ef111111111111111111' };
    const message2 = { id: '5cf8ef222222222222222222' };
    const payload = [message1, message2];
    await testAction(actions.addMessages, payload, state, [
      {
        type: types.ADD_TO_MESSAGE_MAP,
        payload
      }
    ]);
  });
});
