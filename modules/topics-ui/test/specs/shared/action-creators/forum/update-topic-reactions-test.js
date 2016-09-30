import {equal} from 'assert';

import createAction from '../../../../../shared/action-creators/forum/update-topic-reactions';
import { UPDATE_TOPIC_REACTIONS } from '../../../../../shared/constants/forum.js';

describe('updateTopicReactions', () => {

  it('should return the right type', () => {
    equal(createAction().type, UPDATE_TOPIC_REACTIONS);
  });

});
