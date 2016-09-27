import {ok, equal} from 'assert';
import {CommentsStore} from '../../../../browser/js/stores/comments-store';
import {dispatch} from '../../../../shared/dispatcher';
import showReplyComments from '../../../../shared/action-creators/topic/show-reply-comments';

describe('CommentsStore', () => {

  let store;
  beforeEach(() => {
    store = new CommentsStore();
  });

  it('should provide a getComments()', () => {
    ok(store.getComments);
  });

  it('should update its context model when the right action is dispatched', () => {
    dispatch(showReplyComments('test'));
    equal(store.contextModel.get('replyId'), 'test');
  });

});
