import assert from 'assert';
import {stub} from 'sinon';
import Store from '../../../../browser/js/stores/topics-store.js';
import {dispatch} from '../../../../shared/dispatcher';
import submitNewTopic from '../../../../shared/action-creators/create-topic/submit-new-topic';

export default describe('TopicsStore', () => {

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

  it.skip('should call create after the submit new topic event', () => {
    //Why is this called four times??
    stub(Store.prototype, 'create');
    store = new Store(models);
    dispatch(submitNewTopic('title', 'body'));
    Store.prototype.create.restore();
  });

});
