import assert, { ok } from 'assert';
import {dispatch} from '../../../../shared/dispatcher';

//Mocks
import topics from '../../../mocks/mock-data/topics';
import forumStore from '../../../mocks/forum-store';
import mockRouter from '../../../mocks/router';
import currentUserStore from '../../../mocks/current-user-store';

//Actions
import updateTopic from '../../../../shared/action-creators/topic/update-topic';
import updateCancelTopic from '../../../../shared/action-creators/topic/update-cancel-topic';

//Const
import {
  DEFAULT_CATEGORY_NAME,
  DEFAULT_TAG_NAME
} from '../../../../shared/constants/navigation';

import {FILTER_BY_TOPIC} from '../../../../shared/constants/forum-filters';

import {MODEL_STATE_DRAFT, MODEL_STATE_SYNCED} from '../../../../shared/constants/model-states';

import injector from 'inject-loader!../../../../browser/js/stores/topics-store.js';
const {TopicsStore, TopicModel} = injector({
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
      var category = m.category;
      assert(category);
      assert.strictEqual(category.slug, 'test-1')
    });
  });

  it('should return all the models when the category is default', () => {
    mockRouter.set({ router: 'forum', categoryName: DEFAULT_CATEGORY_NAME });
    const result = store.getTopics();
    assert.equal(result.length, topics.length);
  });

  //I think this is actually broken and should be fixed
  it('should filter by tag when the router is in the right state', () => {
    mockRouter.set({
      router: 'forum',
      categoryName: DEFAULT_CATEGORY_NAME,
      tagName: '2'
    });
    const result = store.getTopics();
    assert(result.length !== topics.length);
    result.forEach((m) => {
      var tags = m.tags;
      ok(tags.some((tag) => {
        return tag.value === '2';
      }), 'tags dont include 2');
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

  it('should update the right topic when the topic update action is fired', () => {
    const expected = 'this is a test';
    mockRouter.set('topicId', '1');
    dispatch(updateTopic(expected));
    const model = store.collection.get('1');
    const result = model.get('text');
    assert.equal(result, expected);
  });

  it('should set the text of the right model when the topic edit cancel event fires', () => {
    mockRouter.set('topicId', '1');
    dispatch(updateCancelTopic());
    const model = store.collection.get('1');
    const result = model.get('text');
    assert.equal(result, null);
  });

  it('should create a new draft model when the router changed createTopic to true', () => {
    mockRouter.set({ createTopic: true });
    const model = store.topicCollection.findWhere({ state: MODEL_STATE_DRAFT });
    assert(model);
  });

  it('should remove draft models the the router changes createTopic to false', () => {
    mockRouter.set({ createTopic: true });
    mockRouter.set({ createTopic: false });
    const models = store.topicCollection.filter((model) => model.get('state') === MODEL_STATE_DRAFT);
    assert.equal(models.length, 0);
  });

  it('should not return any draft topics from getTopics', () => {
    mockRouter.set({ createTopic: true });
    const result = store.getTopics();
    result.forEach((model) => {
      assert(model.state !== MODEL_STATE_DRAFT, 'A model from getTopics is in a draft state');
    });
  });

  it('should return a sigular draft topic from getDraftTopic', () => {
    mockRouter.set({ createTopic: true });
    const result = store.getDraftTopic();
    assert.equal(result.state, MODEL_STATE_DRAFT);
  });

});


import updateTitle from '../../../../shared/action-creators/create-topic/title-update';
import updateBody from '../../../../shared/action-creators/create-topic/body-update';
import categoryUpdate from '../../../../shared/action-creators/create-topic/category-update';
import tagsUpdate from '../../../../shared/action-creators/create-topic/tags-update';


describe('TopicModel', () => {

  let model;
  beforeEach(() => {
    model = new TopicModel();
  });

  it('should have a default state of draft when created', () => {
    assert.equal(model.get('state'), MODEL_STATE_DRAFT);
  });

  it('should update the title when the right action is fired', () => {
    dispatch(updateTitle('test'));
    assert.equal(model.get('title'), 'test');
  });

  it('should not update the title when the model is not in a draft state', () => {
    model.set('state', MODEL_STATE_SYNCED);
    dispatch(updateTitle('test'));
    assert.notEqual(model.get('title'), 'test');
  });

  it('should update the body when the right action is fired', () => {
    dispatch(updateBody('test'));
    assert.equal(model.get('text'), 'test');
  });

  it('should not update the body when the model is not in a draft state', () => {
    model.set('state', MODEL_STATE_SYNCED);
    dispatch(updateBody('test'));
    assert.notEqual(model.get('body'), 'test');
  });

  it('should update the category id when the right action is fired', () => {
    dispatch(categoryUpdate('test'))
    assert.equal(model.get('categoryId'), 'test');
  });

  it('should not update the category id when the model is not in the draft state', () => {
    model.set('state', MODEL_STATE_SYNCED);
    dispatch(categoryUpdate('test'))
    assert.notEqual(model.get('categoryId'), 'test');
  });

  it('should update the tags when the right action is fired', () => {
    dispatch(tagsUpdate('1'));
    dispatch(tagsUpdate('2'));
    dispatch(tagsUpdate('3'));
    assert.deepEqual(model.get('tags'), ['1', '2', '3']);
  });

});
