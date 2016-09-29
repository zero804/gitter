import {equal} from 'assert';

import createAction from '../../../../../shared/action-creators//topic//cancel-update-reply';
import { CANCEL_UPDATE_REPLY } from '../../../../../shared/constants/topic.js';

describe('cancelUpdateReply', () => {

  it('should return the right type', () => {
    equal(createAction().type, CANCEL_UPDATE_REPLY);
  });

});
