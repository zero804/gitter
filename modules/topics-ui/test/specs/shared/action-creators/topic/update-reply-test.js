import {equal} from 'assert';

import createAction from '../../../../../shared/action-creators//topic//update-reply';
import { UPDATE_REPLY } from '../../../../../shared/constants/topic.js';

describe('updateReply', () => {

  it('should return the right type', () => {
    equal(createAction().type, UPDATE_REPLY);
  });

});
