import {equal} from 'assert';

import createAction from '../../../../../shared/action-creators//topic//update-comment';
import { UPDATE_COMMENT } from '../../../../../shared/constants/topic.js';

describe('updateComment', () => {

  it('should return the right type', () => {
    equal(createAction().type, UPDATE_COMMENT);
  });

});
