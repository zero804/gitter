import {equal} from 'assert';

import createAction from '../../../../../shared/action-creators/forum/update-topic-watch-state';
import { UPDATE_TOPIC_SUBSCRIPTION_STATE } from '../../../../../shared/constants/forum';

describe('updateTopicWatchState', () => {

  it('should return the right type', () => {
    equal(createAction().type, UPDATE_TOPIC_SUBSCRIPTION_STATE);
  });

});
