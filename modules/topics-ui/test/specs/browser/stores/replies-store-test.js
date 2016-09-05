import assert from 'assert';
import {RepliesStore} from '../../../../browser/js/stores/replies-store';
import forumStore from '../../../mocks/forum-store';
import replies from '../../../mocks/mock-data/replies';
import router from '../../../mocks/router';

describe('RepliesStore', () => {

  let store;
  beforeEach(() => {
    store = new RepliesStore(replies, {
      forumStore: forumStore,
      router: router
    });
  });

  it('should provide a getReplies()', () => {
    assert(store.getReplies);
  });

});
