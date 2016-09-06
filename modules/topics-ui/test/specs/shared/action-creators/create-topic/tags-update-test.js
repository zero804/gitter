import {equal} from 'assert';

import createAction from '../../../../../shared/action-creators//create-topic//tags-update';
import { TAGS_UPDATE } from '../../../../../shared/constants/create-topic.js';

describe('tagsUpdate', () => {

  it('should return the right type', () => {
    equal(createAction().type, TAGS_UPDATE);
  });

});
