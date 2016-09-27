import {equal} from 'assert';

import createAction from '../../../../../shared/action-creators//create-comment//submit-new-comment';
import { SUBMIT_NEW_COMMENT } from '../../../../../shared/constants/create-comment.js';

describe('submitNewComment', () => {

  it('should return the right type', () => {
    equal(createAction().type, SUBMIT_NEW_COMMENT);
  });

});
