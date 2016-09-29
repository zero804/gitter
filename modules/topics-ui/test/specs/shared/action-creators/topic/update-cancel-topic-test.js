import {equal} from 'assert';

import createAction from '../../../../../shared/action-creators//topic//update-cancel-topic';
import { UPDATE_CANCEL_TOPIC } from '../../../../../shared/constants/topic.js';

describe('updateCancelTopic', () => {

  it('should return the right type', () => {
    equal(createAction().type, UPDATE_CANCEL_TOPIC);
  });

});
