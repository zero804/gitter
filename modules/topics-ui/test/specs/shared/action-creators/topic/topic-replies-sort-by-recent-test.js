import {equal} from 'assert';

import createAction from '../../../../../shared/action-creators/topic/topic-replies-sort-by-recent';
import { TOPIC_REPLIES_SORT_BY_RECENT } from '../../../../../shared/constants/topic.js';

describe('topicRepliesSortByRecent', () => {

  it('should return the right type', () => {
    equal(createAction().type, TOPIC_REPLIES_SORT_BY_RECENT);
  });

});
