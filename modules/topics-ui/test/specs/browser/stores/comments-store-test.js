import {ok} from 'assert';
import {CommentsStore} from '../../../../browser/js/stores/comments-store';

describe('CommentsStore', () => {

  let store;
  beforeEach(() => {
    store = new CommentsStore();
  });

  it('should provide a getComments()', () => {
    ok(store.getComments);
  });

});
