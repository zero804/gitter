import {equal} from 'assert';

import createAction from '../../../../../shared/action-creators/forum/update-forum-watch-state';
import { UPDATE_FORUM_SUBSCRIPTION_STATE } from '../../../../../shared/constants/forum';

describe('updateForumWatchState', () => {

  it('should return the right type', () => {
    equal(createAction().type, UPDATE_FORUM_SUBSCRIPTION_STATE);
  });

});
