import assert from 'assert';
import {RepliesStore} from '../../../../browser/js/stores/replies-store';
import forumStore from '../../../mocks/forum-store';
import replies from '../../../mocks/mock-data/replies';
import router from '../../../mocks/router';
import {dispatch} from '../../../../shared/dispatcher';
import navigateToTopic from '../../../../shared/action-creators/topic/navigate-to-topic';

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

  it('should reset when navigating to topic', () => {
    assert(store.length);
    dispatch(navigateToTopic());
    assert.equal(store.length, 0);
  });

});
