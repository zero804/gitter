import assert from 'assert';
import {RepliesStore} from '../../../../browser/js/stores/replies-store';

describe('RepliesStore', () => {

  let store;
  beforeEach(() => {
    store = new RepliesStore();
  });

  it('should provide a getReplies()', () => {
    assert(store.getReplies);
  });

});
