import {equal} from 'assert';

import createAction from '../../../../../shared/action-creators/create-topic/category-update';
import { CATEGORY_UPDATE } from '../../../../../shared/constants/create-topic.js';

describe('categoryUpdate', () => {

  it('should return the right type', () => {
    equal(createAction().type, CATEGORY_UPDATE);
  });

});
