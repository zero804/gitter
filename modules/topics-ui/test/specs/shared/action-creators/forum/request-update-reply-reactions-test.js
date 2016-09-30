import {equal} from 'assert';

import createAction from '../../../../../shared/action-creators/forum/request-update-reply-reactions';
import { REQUEST_UPDATE_REPLY_REACTIONS } from '../../../../../shared/constants/forum.js';

describe('requestUpdateReplyReactions', () => {

  it('should return the right type', () => {
    equal(createAction().type, REQUEST_UPDATE_REPLY_REACTIONS);
  });

});
