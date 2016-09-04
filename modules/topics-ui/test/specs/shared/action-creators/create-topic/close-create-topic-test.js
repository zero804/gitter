import {equal} from 'assert';

import createAction from '../../../../../shared/action-creators//create-topic//close-create-topic';
import { CLOSE_CREATE_TOPIC } from '../../../../../shared/constants/create-topic.js';

describe('closeCreateTopic', () => {

  it('should return the right type', () => {
    equal(createAction().type, CLOSE_CREATE_TOPIC);
  });

});
