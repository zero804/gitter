import {equal} from 'assert';

import createAction from '../../../../../shared/action-creators/topic/update-category';
import { UPDATE_TOPIC_CATEGORY } from '../../../../../shared/constants/topic.js';

describe('updateCategory', () => {

  it('should return the right type', () => {
    equal(createAction().type, UPDATE_TOPIC_CATEGORY);
  });

});
