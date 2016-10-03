import {equal} from 'assert';

import createAction from '../../../../../shared/action-creators//topic//update-cancel-comment';
import { UPDATE_CANCEL_COMMENT } from '../../../../../shared/constants/topic.js';

describe('updateCancelComment', () => {

  it('should return the right type', () => {
    equal(createAction().type, UPDATE_CANCEL_COMMENT);
  });

});
