import {equal} from 'assert';

import createAction from '../../../../../shared/action-creators//create-reply//submit-new-reply';
import { SUBMIT_NEW_REPLY } from '../../../../../shared/constants/create-reply.js';

describe('submitNewReply', () => {

  it('should return the right type', () => {
    equal(createAction().type, SUBMIT_NEW_REPLY);
  });

});
