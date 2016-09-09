import {equal} from 'assert';
import NewReplyStore from '../../../../browser/js/stores/new-reply-store';
import {dispatch} from '../../../../shared/dispatcher';
import updateReplyBody from '../../../../shared/action-creators/create-reply/body-update';

describe('NewReplyStore', () => {

  let store;
  beforeEach(() => {
    store = new NewReplyStore();
  });

  it('should update the text attribute when the right action is dispatched', () => {
    const content = 'This is a test';
    dispatch(updateReplyBody(content));
    equal(store.get('text'), content);
  });

});
