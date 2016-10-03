import {equal} from 'assert';

import createAction from '../../../../../shared/action-creators//topic//update-save-comment';
import { UPDATE_SAVE_COMMENT } from '../../../../../shared/constants/topic.js';

describe('updateSaveComment', () => {

  it('should return the right type', () => {
    equal(createAction().type, UPDATE_SAVE_COMMENT);
  });

});
