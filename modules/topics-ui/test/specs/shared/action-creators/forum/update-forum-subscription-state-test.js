import {equal} from 'assert';

import createAction from '../../../../../shared/action-creators/forum/update-forum-subscription-state';
import { UPDATE_FORUM_SUBSCRIPTION_STATE } from '../../../../../shared/constants/forum';

describe('updateForumSubscriptionState', () => {

  it('should return the right type', () => {
    equal(createAction().type, UPDATE_FORUM_SUBSCRIPTION_STATE);
  });

});
