import {equal} from 'assert';

import createAction from '../../../../../shared/action-creators/topic/update-topic-is-editing';
import { UPDATE_TOPIC_IS_EDITING } from '../../../../../shared/constants/topic.js';

describe('updateTopicIsEditing', () => {

  it('should return the right type', () => {
    equal(createAction().type, UPDATE_TOPIC_IS_EDITING);
  });

});
