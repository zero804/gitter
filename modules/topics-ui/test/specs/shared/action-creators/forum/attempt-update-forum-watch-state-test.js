import {equal} from 'assert';

import createAction from '../../../../../shared/action-creators/forum/attempt-update-forum-watch-state';
import { ATTEMPT_UPDATE_FORUM_WATCH_STATE } from '../../../../../shared/constants/forum.js';

describe('attemptUpdateForumWatchState', () => {

  it('should return the right type', () => {
    equal(createAction().type, ATTEMPT_UPDATE_FORUM_WATCH_STATE);
  });

});
