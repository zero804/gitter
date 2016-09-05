import {equal} from 'assert';
import Store from '../../../../browser/js/stores/new-topic-store';
import {dispatch} from '../../../../shared/dispatcher';
import updateTitle from '../../../../shared/action-creators/create-topic/title-update';
import updateBody from '../../../../shared/action-creators/create-topic/body-update';
import categoryUpdate from '../../../../shared/action-creators/create-topic/category-update';

describe('NewTopicStore', () => {

  let store;
  beforeEach(() => {
    store = new Store();
  });

  it('should update the title when the right action is fired', () => {
    dispatch(updateTitle('test'));
    equal(store.get('title'), 'test');
  });

  it('should update the body when the right action is fired', () => {
    dispatch(updateBody('test'));
    equal(store.get('body'), 'test');
  });

  it('should update the category id when the right action is fired', () => {
    dispatch(categoryUpdate('test'))
    equal(store.get('categoryId'), 'test');
  });


});
