import assert from 'assert';
import Store from '../../../../browser/js/stores/topics-store.js';

describe('TopicsStore', () => {

  let store;
  const models = [
    { id: 1 },
    { id: 2 },
  ];

  beforeEach(() => {
    store = new Store(models);
  });

  it('should provide a getTopics()', () => {
    assert(store.getTopics);
  });

  it('should get a topic but id', () => {
    assert.deepEqual(store.getById(1), models[0]);
  });

});
