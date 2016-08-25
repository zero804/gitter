import {equal} from 'assert';

import createAction from '../../../../../shared/action-creators//create-topic//navigate-to-create-topic';
import { NAVIGATE_TO_CREATE_TOPIC } from '../../../../../shared/constants/create-topic.js';

describe('navigateToCreateTopic', () => {

  it('should return the right type', () => {
    equal(createAction().type, NAVIGATE_TO_CREATE_TOPIC);
  });

});
