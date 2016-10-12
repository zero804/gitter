import assert from 'assert';
import sinon from 'sinon';
import {UPDATE_ACTIVE_CATEGORY} from '../../../../shared/constants/forum-categories';
import mockRouter from '../../../mocks/router';
import categories from '../../../mocks/mock-data/categories';


import injector from 'inject-loader!../../../../browser/js/stores/forum-category-store';
const {ForumCategoryStore} = injector({
  '../routers/index': mockRouter
});


describe('ForumCategoryStore', function(){

  let handle;
  let categoryStore;

  beforeEach(function(){
    handle = sinon.spy();
    categoryStore = new ForumCategoryStore(categories);
  });

  it('should update the active element when the route changes', function(){
    mockRouter.set('category', 'test-1');
    assert.equal(categoryStore.at(0).get('active'), false);
    assert(categoryStore.at(1).get('active'));
  });

  it('should dispatch un active:update event when the active category changes', function(){
    categoryStore.on(UPDATE_ACTIVE_CATEGORY, handle);
    mockRouter.set('category', 'test-2');
    assert.equal(handle.callCount, 1);
  });

  it('should return the active category name from getActiveCategoryName()', () => {
    assert.equal(categoryStore.getActiveCategoryName(), 'all');
  });

  it('should have a mapForSelectControl function that transfoms the data', () => {
    categoryStore.mapForSelectControl().forEach((c) => {
      assert(c.label);
      assert(c.value);
    });
  });

});
