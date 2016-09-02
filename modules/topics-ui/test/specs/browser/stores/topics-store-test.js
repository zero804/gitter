import assert from 'assert';
import {stub} from 'sinon';
import Store from '../../../../browser/js/stores/topics-store.js';
import {dispatch} from '../../../../shared/dispatcher';
import submitNewTopic from '../../../../shared/action-creators/create-topic/submit-new-topic';
import mockRouter from '../../../mocks/router';
import topics from '../../../mocks/mock-data/topics';

export default describe('TopicsStore', () => {

  let store;
  beforeEach(() => {
    store = new Store(topics, { router: mockRouter });
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
