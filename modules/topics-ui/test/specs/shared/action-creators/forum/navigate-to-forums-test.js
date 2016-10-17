import {equal} from 'assert';

import createAction from '../../../../../shared/action-creators/forum/navigate-to-forums';
import { NAVIGATE_TO_FORUMS } from '../../../../../shared/constants/forum.js';

describe('navigateToForums', () => {

  it('should return the right type', () => {
    equal(createAction().type, NAVIGATE_TO_FORUMS);
  });

});
