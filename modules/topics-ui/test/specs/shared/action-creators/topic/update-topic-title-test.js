import {equal} from 'assert';

import createAction from '../../../../../shared/action-creators/topic/update-topic-title';
import { UPDATE_TOPIC_TITLE } from '../../../../../shared/constants/avatar-sizes.js';

describe('updateTopicTitle', () => {

  it('should return the right type', () => {
    equal(createAction().type, UPDATE_TOPIC_TITLE);
  });

});
