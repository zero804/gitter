import {equal} from 'assert';

import createAction from '../../../../../shared/action-creators/topic/topic-replies-sort-by-liked';
import { TOPIC_REPLIES_SORT_BY_LIKED } from '../../../../../shared/constants/topic.js';

describe('topicRepliesSortByLiked', () => {

  it('should return the right type', () => {
    equal(createAction().type, TOPIC_REPLIES_SORT_BY_LIKED);
  });

});
