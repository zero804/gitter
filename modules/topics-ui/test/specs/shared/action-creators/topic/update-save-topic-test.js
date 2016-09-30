import {equal} from 'assert';

import createAction from '../../../../../shared/action-creators//topic//update-save-topic';
import { UPDATE_SAVE_TOPIC } from '../../../../../shared/constants/topic.js';

describe('updateSaveTopic', () => {

  it('should return the right type', () => {
    equal(createAction().type, UPDATE_SAVE_TOPIC);
  });

});
