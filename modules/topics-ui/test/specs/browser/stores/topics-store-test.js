import assert from 'assert';
import {dispatch} from '../../../../shared/dispatcher';

//Mocks
import topics from '../../../mocks/mock-data/topics';
import forumStore from '../../../mocks/forum-store';
import mockRouter from '../../../mocks/router';
import currentUserStore from '../../../mocks/current-user-store';

//Actions
import updateTopic from '../../../../shared/action-creators/topic/update-topic';

//Const
import {
  DEFAULT_CATEGORY_NAME,
  DEFAULT_TAG_NAME
} from '../../../../shared/constants/navigation';
import {FILTER_BY_TOPIC} from '../../../../shared/constants/forum-filters';

import injector from 'inject-loader!../../../../browser/js/stores/topics-store.js';
const {TopicsStore} = injector({
  './forum-store': forumStore,
  '../routers': mockRouter,
  '../stores/current-user-store': currentUserStore
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
    var topicWithId1 = store.getById('1');
    assert(topicWithId1);
    assert.strictEqual(topicWithId1.id, '1');
  });

  it('should filter by category when the router is in the right state', () => {
    mockRouter.set({ router: 'forum', categoryName: 'test-1' });
    const result = store.getTopics();
    assert(result.length);
    result.forEach((m) => {
      var category = m.get('category');
      assert(category);
      assert.strictEqual(category.slug, 'test-1')
    });
  });

  it('should return all the models when the category is default', () => {
    mockRouter.set({ router: 'forum', categoryName: DEFAULT_CATEGORY_NAME });
    const result = store.getTopics();
    assert.equal(result.length, topics.length);
  });

  it('should filter by tag when the router is in the right state', () => {
    mockRouter.set({
      router: 'forum',
      categoryName: DEFAULT_CATEGORY_NAME,
      tagName: '2'
    });
    const result = store.getTopics();
    assert(result.length !== topics.length);
    result.forEach((m) => {
      var tags = m.get('tags');
      assert(tags.includes('2'), 'tags dont include 2');
    });
  });

  it('shouldn\'t filter by tag if the default is passed', () => {
    mockRouter.set({
      router: 'forum',
      categoryName: DEFAULT_CATEGORY_NAME,
      tagName: DEFAULT_TAG_NAME
    });
    const result = store.getTopics();
    assert.equal(result.length, topics.length);
  });

  it('should filter by user when the right filter value is passed', () => {
    mockRouter.set({
      router: 'forum',
      categoryName: DEFAULT_CATEGORY_NAME,
      tagName: DEFAULT_TAG_NAME,
      filterName: FILTER_BY_TOPIC
    });
    const result = store.getTopics();
    assert.strictEqual(result.length, 2);
  });

  it.skip('should update the right topic when the topic update action is fired', () => {
    const expected = 'this is a test';
    mockRouter.set('topicId', '1');
    dispatch(updateTopic(expected));
    const model = store.collection.get('1');
    const result = model.get('text');
    assert.equal(result, expected);
  });

});
