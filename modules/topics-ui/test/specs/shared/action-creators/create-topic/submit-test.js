import {equal} from 'assert';

import createAction from '../../../../../shared/action-creators//create-topic//submit';
import { SUBMIT } from '../../../../../shared/constants/create-topic.js';

describe('submit', () => {

  it('should return the right type', () => {
    equal(createAction().type, SUBMIT);
  });

});
