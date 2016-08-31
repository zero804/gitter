import {equal} from 'assert';

import createAction from '../../../../../shared/action-creators//create-reply//body-update';
import { BODY_UPDATE } from '../../../../../shared/constants/create-topic.js';

describe('replyBodyUpdate', () => {

  it('should return the right type', () => {
    equal(createAction('test').type, BODY_UPDATE);
  });

  it('should throw an error if no value is passed', () => {
   try { createAction(); }
   catch(e) { equal(e.message, 'updateReplyBody called with no value'); }
  });

  it('should correctly pass the value', () => {
    const val = 'test';
    equal(createAction(val).value, val, 'failed to pass the correct update value');
  });

});
