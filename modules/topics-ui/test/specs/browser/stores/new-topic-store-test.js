import {equal} from 'assert';
import {spy} from 'sinon';
import Store from '../../../../browser/js/stores/new-topic-store';
import {dispatch} from '../../../../shared/dispatcher';
import updateTitle from '../../../../shared/action-creators/create-topic/title-update';
import {STORE_UPDATE} from '../../../../shared/constants/create-topic';
import updateBody from '../../../../shared/action-creators/create-topic/body-update';

export default describe('NewTopicStore', () => {

  let store;
  beforeEach(() => {
    store = new Store();
  });

  it('should update the title when the right action is fired', () => {
    dispatch(updateTitle('test'));
    equal(store.get('title'), 'test');
  });

  it('should trigger a change event when the title updates', () => {
    const handle = spy();
    store.on(STORE_UPDATE, handle);
    dispatch(updateTitle('test'));
    equal(handle.callCount, 1);
  });

  it('should update the body when the right action is fired', () => {
    dispatch(updateBody('test'));
    equal(store.get('body'), 'test');
  });

  it('should trigger a change event when the body updates', () => {
    const handle = spy();
    store.on(STORE_UPDATE, handle);
    dispatch(updateBody('test'));
    equal(handle.callCount, 1);
  });

});