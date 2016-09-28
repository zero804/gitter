import {equal} from 'assert';

import createAction from '../../../../../shared/action-creators/forum/request-update-forum-subscription-state';
import { REQUEST_UPDATE_FORUM_SUBSCRIPTION_STATE } from '../../../../../shared/constants/forum.js';

describe('requestUpdateForumSubscriptionState', () => {

  it('should return the right type', () => {
    equal(createAction().type, REQUEST_UPDATE_FORUM_SUBSCRIPTION_STATE);
  });

});
