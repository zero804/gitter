import {equal} from 'assert';

import createAction from '../../../../../shared/action-creators//topic//update-topic';
import { UPDATE_TOPIC } from '../../../../../shared/constants/topic.js';

describe('updateTopic', () => {

  it('should return the right type', () => {
    equal(createAction().type, UPDATE_TOPIC);
  });

});
