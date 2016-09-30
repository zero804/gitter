import {ok, equal} from 'assert';
import {dispatch} from '../../../../shared/dispatcher';

import {CommentsStore} from '../../../../browser/js/stores/comments-store';

import comments from '../../../mocks/mock-data/comments';

import showReplyComments from '../../../../shared/action-creators/topic/show-reply-comments';
import updateComment from '../../../../shared/action-creators/topic/update-comment';
import cancelUpdateComment from '../../../../shared/action-creators/topic/update-cancel-comment';

describe('CommentsStore', () => {

  let store;
  beforeEach(() => {
    store = new CommentsStore(comments);
  });

  it('should provide a getComments()', () => {
    ok(store.getComments);
  });

  it('should update its context model when the right action is dispatched', () => {
    dispatch(showReplyComments('test'));
    equal(store.contextModel.get('replyId'), 'test');
  });

  it('should update a model when the updateComment action is dispatched', () => {
    dispatch(updateComment('1', 'test'));
    const result = store.get('1').get('text');
    equal(result, 'test');
  });

  it('should reset the text value when a cancel edit action is called', () => {
    dispatch(updateComment('1', 'test'));
    equal(store.get('1').get('text'), 'test');
    dispatch(cancelUpdateComment('1'));
    equal(store.get('1').get('text'), null);
  });

});
