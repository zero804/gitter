import {equal} from 'assert';

import createAction from '../../../../../shared/action-creators/forum/request-update-topic-subscription-state';
import { REQUEST_UPDATE_TOPIC_SUBSCRIPTION_STATE } from '../../../../../shared/constants/forum.js';

describe('requestUpdateTopicSubscriptionState', () => {

  it('should return the right type', () => {
    equal(createAction().type, REQUEST_UPDATE_TOPIC_SUBSCRIPTION_STATE);
  });

});
