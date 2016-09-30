import {equal} from 'assert';

import createAction from '../../../../../shared/action-creators/forum/request-update-comment-reactions';
import { REQUEST_UPDATE_COMMENT_REACTIONS } from '../../../../../shared/constants/forum.js';

describe('requestUpdateCommentReactions', () => {

  it('should return the right type', () => {
    equal(createAction().type, REQUEST_UPDATE_COMMENT_REACTIONS);
  });

});
