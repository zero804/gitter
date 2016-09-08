import assert from 'assert';

//Mocks
import topics from '../../../mocks/mock-data/topics';
import forumStore from '../../../mocks/forum-store';
import mockRouter from '../../../mocks/router';

import injector from 'inject-loader!../../../../browser/js/stores/topics-store.js';
const {TopicsStore} = injector({
  './forum-store': forumStore,
  '../routers': mockRouter
});

describe('TopicsStore', () => {

  let store;
  beforeEach(() => {
    store = new TopicsStore(topics);
  });

  it('should provide a getTopics()', () => {
    assert(store.getTopics);
  });

  it('should get a topic but id', () => {
    assert.deepEqual(store.getById('1').id, topics[0].id);
  });

  it.only('should filter by category when the router is in the right state', () => {
    mockRouter.set({ router: 'forum', categoryName: 'test-1' });
    const result = store.getTopics();
    assert(result.length);
    result.forEach((m) => assert.equal(m.category.slug, 'test-1'));
  });

});
