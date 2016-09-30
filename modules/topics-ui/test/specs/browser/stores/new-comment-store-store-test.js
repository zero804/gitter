import {equal} from 'assert';
import NewCommentStore from '../../../../browser/js/stores/new-comment-store-store';
import {dispatch} from '../../../../shared/dispatcher';
import commentBodyUpdate from '../../../../shared/action-creators/create-comment/body-update';
import showReplyComments from '../../../../shared/action-creators/topic/show-reply-comments';

describe('NewCommentStoreStore', () => {

  let store;
  beforeEach(() => {
    store = new NewCommentStore();
  });

  it('should update the "text" field when the right action takes place', () => {
    dispatch(commentBodyUpdate(1, 'test'));
    equal(store.get('text'), 'test');
    equal(store.get('replyId'), 1);
  });

  it('should clear the text field when the right action takes place', () => {
    dispatch(commentBodyUpdate(1, 'test'));
    dispatch(showReplyComments());
    equal(store.get('text'), '');
  });

});
