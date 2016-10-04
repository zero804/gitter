import {equal} from 'assert';

import createAction from '../../../../../shared/action-creators/topic/topic-replies-sort-by-comments';
import { TOPIC_REPLIES_SORT_BY_COMMENTS } from '../../../../../shared/constants/topic.js';

describe('topicRepliesSortByComments', () => {

  it('should return the right type', () => {
    equal(createAction().type, TOPIC_REPLIES_SORT_BY_COMMENTS);
  });

});
