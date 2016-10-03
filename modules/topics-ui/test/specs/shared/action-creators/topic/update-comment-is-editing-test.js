import {equal} from 'assert';

import createAction from '../../../../../shared/action-creators/topic/update-comment-is-editing';
import { UPDATE_COMMENT_IS_EDITING } from '../../../../../shared/constants/topic.js';

describe('updateCommentIsEditing', () => {

  it('should return the right type', () => {
    equal(createAction().type, UPDATE_COMMENT_IS_EDITING);
  });

});
