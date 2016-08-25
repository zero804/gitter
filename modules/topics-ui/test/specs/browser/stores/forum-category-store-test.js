import assert from 'assert';
import sinon from 'sinon';
import CategoryStore from '../../../../browser/js/stores/forum-category-store';
import * as forumCatConstants from '../../../../shared/constants/forum-categories';
import mockRouter from '../../../mocks/router';
import categories from '../../../mocks/mock-data/categories';

describe('ForumCategoryStore', function(){

  let categoryStore;
  let handle;

  beforeEach(function(){
    handle = sinon.spy();
    categoryStore = new CategoryStore(categories, { router: mockRouter });
  });

  it('should update the active element when the route changes', function(){
    mockRouter.set('categoryName', 'test-1');
    assert.equal(categoryStore.at(0).get('active'), false);
    assert(categoryStore.at(1).get('active'));
  });

  //This works when run with only ???
  it.skip('should dispatch un active:update event when the active category changes', function(){
    categoryStore.on(forumCatConstants.UPDATE_ACTIVE_CATEGORY, handle)
    mockRouter.set('categoryName', 'test-1');
    assert.equal(handle.callCount, 1);
  });

  it('should return the active category name from getActiveCategoryName()', () => {
    assert.equal(categoryStore.getActiveCategoryName(), 'all');
  });

});
