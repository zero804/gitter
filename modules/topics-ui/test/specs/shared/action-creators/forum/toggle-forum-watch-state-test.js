import {equal} from 'assert';

import createAction from '../../../../../shared/action-creators/forum/toggle-forum-watch-state';
import { TOGGLE_FORUM_WATCH_STATE } from '../../../../../shared/constants/forum';

describe('toggleForumWatchState', () => {

  it('should return the right type', () => {
    equal(createAction().type, TOGGLE_FORUM_WATCH_STATE);
  });

});
