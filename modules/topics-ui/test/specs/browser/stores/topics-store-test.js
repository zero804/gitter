import assert from 'assert';
import {stub} from 'sinon';
import {dispatch} from '../../../../shared/dispatcher';
import submitNewTopic from '../../../../shared/action-creators/create-topic/submit-new-topic';

//Mocks
import topics from '../../../mocks/mock-data/topics';
import forumStore from '../../../mocks/forum-store';

import injector from 'inject-loader!../../../../browser/js/stores/topics-store.js';
const {getTopicsStore} = injector({
  './forum-store': forumStore
});

describe('TopicsStore', () => {

  let store;
  beforeEach(() => {
    store = getTopicsStore(topics);
  });

  it('should provide a getTopics()', () => {
    assert(store.getTopics);
  });

  it('should get a topic but id', () => {
    assert.deepEqual(store.getById(1).id, topics[0].id);
  });

  it.skip('should call create after the submit new topic event', () => {
    //Why is this called four times??
    stub(Store.prototype, 'create');
    store = new Store(topics);
    dispatch(submitNewTopic('title', 'body'));
    Store.prototype.create.restore();
  });

});
