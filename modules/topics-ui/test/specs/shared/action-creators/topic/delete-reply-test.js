import {equal} from 'assert';

import createAction from '../../../../../shared/action-creators/topic/delete-reply';
import { DELETE_REPLY } from '../../../../../shared/constants/topic.js';

describe('deleteReply', () => {

  it('should return the right type', () => {
    equal(createAction().type, DELETE_REPLY);
  });

});
