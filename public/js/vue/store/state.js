import * as leftMenuConstants from '../left-menu/constants';

function state() {
  return {
    test: 'initialTestValue',

    isMobile: false,

    groupMap: {},
    roomMap: {},

    displayedRoomId: null,
    hightLightedMessageId: null,

    leftMenuState: leftMenuConstants.LEFT_MENU_ALL_STATE,
    leftMenuPinnedState: true,
    leftMenuExpandedState: false,
    favouriteDraggingInProgress: false,

    search: {
      searchInputValue: '',

      current: { results: [] },
      repo: { loading: false, error: false, results: [] },
      room: { loading: false, error: false, results: [] },
      people: { loading: false, error: false, results: [] },
      message: { loading: false, error: false, results: [] }
    }
  };
}

export default state;
