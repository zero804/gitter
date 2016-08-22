import {equal} from 'assert';

import createAction from '../../../../../shared/action-creators//create-topic//body-update';
import { BODY_UPDATE } from '../../../../../shared/constants/create-topic.js';

export default describe('bodyUpdate', () => {

  it('should return the right type', () => {
    equal(createAction().type, BODY_UPDATE);
  });

});
