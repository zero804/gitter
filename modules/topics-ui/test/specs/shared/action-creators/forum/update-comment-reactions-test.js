import {equal} from 'assert';

import createAction from '../../../../../shared/action-creators/forum/update-comment-reactions';
import { UPDATE_COMMENT_REACTIONS } from '../../../../../shared/constants/forum.js';

describe('updateCommentReactions', () => {

  it('should return the right type', () => {
    equal(createAction().type, UPDATE_COMMENT_REACTIONS);
  });

});
