import {equal} from 'assert';

import createAction from '../../../../../shared/action-creators/topic/delete-comment';
import { DELETE_COMMENT } from '../../../../../shared/constants/topic.js';

describe('deleteComment', () => {

  it('should return the right type', () => {
    equal(createAction().type, DELETE_COMMENT);
  });

});
