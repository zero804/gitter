import {equal} from 'assert';

import createAction from '../../../../../shared/action-creators//topic/show-reply-comments';
import { SHOW_REPLY_COMMENTS } from '../../../../../shared/constants/topic';

describe('showReplyComments', () => {

  it('should return the right type', () => {
    equal(createAction().type, SHOW_REPLY_COMMENTS);
  });

});
