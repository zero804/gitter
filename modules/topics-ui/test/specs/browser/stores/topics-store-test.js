import assert from 'assert';
import Store from '../../../../browser/js/stores/topics-store.js';

describe('TopicsStore', () => {

  let store;
  beforeEach(() => {
    store = new Store();
  });

  it('should provide a getTopics()', () => {
    assert(store.getTopics);
  });

});
