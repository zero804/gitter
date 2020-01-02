import * as leftMenuConstants from '../left-menu/constants';
import * as _ from 'lodash';
import {
  roomSearchRepoRequest,
  roomSearchRoomRequest,
  roomSearchPeopleRequest,
  messageSearchRequest
} from './requests';

function state() {
  return _.defaultsDeep(
    roomSearchRepoRequest.initialState,
    roomSearchRoomRequest.initialState,
    roomSearchPeopleRequest.initialState,
    messageSearchRequest.initialState,
    {
      isMobile: false,
      // `true` just for the sake of easy tests
      isLoggedIn: true,
      darkTheme: false,

      groupMap: {},
      roomMap: {},
      messageMap: {},

      displayedRoomId: null,
      hightLightedMessageId: null,

      leftMenuState: leftMenuConstants.LEFT_MENU_ALL_STATE,
      leftMenuPinnedState: true,
      leftMenuExpandedState: false,
      favouriteDraggingInProgress: false,

      search: {
        searchInputValue: '',

        current: { results: [] }
      }
    }
  );
}

export default state;
