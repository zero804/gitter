import assert from 'assert';
import Store from '../../../../browser/js/stores/replies-store';

describe('RepliesStore', () => {

  let store;
  beforeEach(() => {
    store = new Store();
  });

  it('should provide a getReplies()', () => {
    assert(store.getReplies);
  });

});
