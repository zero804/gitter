import * as leftMenuConstants from '../left-menu/constants';

function state() {
  return {
    test: 'initialTestValue',

    groupMap: {},
    roomMap: {},

    displayedRoomId: null,

    leftMenuState: leftMenuConstants.LEFT_MENU_ALL_STATE,
    leftMenuPinnedState: true,
    leftMenuExpandedState: false,

    search: {
      searchInputValue: '',

      roomSearchLoading: false,
      roomSearchError: false,
      roomSearchResults: [],

      messageSearchLoading: false,
      messageSearchError: false,
      messageSearchResults: []
    }
  };
}

export default state;
