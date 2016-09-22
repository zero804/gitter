import {equal} from 'assert';

import createAction from '../../../../../shared/action-creators//create-comment//body-update';
import { COMMENT_BODY_UPDATE } from '../../../../../shared/constants/create-comment.js';

describe('bodyUpdate', () => {

  it('should return the right type', () => {
    equal(createAction().type, COMMENT_BODY_UPDATE);
  });

});
