import {equal} from 'assert';

import createAction from '../../../../../shared/action-creators/topic/delete-topic';
import { DELETE_TOPIC } from '../../../../../shared/constants/topic.js';

describe('deleteTopic', () => {

  it('should return the right type', () => {
    equal(createAction().type, DELETE_TOPIC);
  });

});
