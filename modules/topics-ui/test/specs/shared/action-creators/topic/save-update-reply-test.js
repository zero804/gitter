import {equal} from 'assert';

import createAction from '../../../../../shared/action-creators//topic//save-update-reply';
import { SAVE_UPDATE_REPLY } from '../../../../../shared/constants/topic.js';

describe('saveUpdateReply', () => {

  it('should return the right type', () => {
    equal(createAction().type, SAVE_UPDATE_REPLY);
  });

});
