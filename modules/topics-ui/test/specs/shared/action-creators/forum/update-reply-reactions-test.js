import {equal} from 'assert';

import createAction from '../../../../../shared/action-creators/forum/update-reply-reactions';
import { UPDATE_REPLY_REACTIONS } from '../../../../../shared/constants/forum.js';

describe('updateReplyReactions', () => {

  it('should return the right type', () => {
    equal(createAction().type, UPDATE_REPLY_REACTIONS);
  });

});
