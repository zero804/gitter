import {equal} from 'assert';

import createAction from '../../../../../shared/action-creators/forum/request-update-reply-subscription-state';
import { REQUEST_UPDATE_REPLY_SUBSCRIPTION_STATE } from '../../../../../shared/constants/forum.js';

describe('requestUpdateReplySubscriptionState', () => {

  it('should return the right type', () => {
    equal(createAction().type, REQUEST_UPDATE_REPLY_SUBSCRIPTION_STATE);
  });

});
