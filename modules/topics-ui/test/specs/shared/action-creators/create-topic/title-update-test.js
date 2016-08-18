import { equal } from 'assert';
import createAction from '../../../../../shared/action-creators/create-topic/title-update';
import {TITLE_UPDATE} from '../../../../../shared/constants/create-topic';

describe('titleUpdate', () => {

  it('should return the right type', () => {
    assert.equal(createAction().type, TITLE_UPDATE);
  });

});
