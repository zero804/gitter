import {equal} from 'assert';

import createAction from '../../../../../shared/action-creators/topic/update-reply-is-editing';
import { UPDATE_REPLY_IS_EDITING } from '../../../../../shared/constants/topic.js';

describe('updateReplyIsEditing', () => {

  it('should return the right type', () => {
    equal(createAction().type, UPDATE_REPLY_IS_EDITING);
  });

});
