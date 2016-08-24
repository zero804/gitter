import assert from 'assert';
import navigateToCategory from '../../../../../shared/action-creators/forum/navigate-to-category';
import * as forumCatConstants from '../../../../../shared/constants/forum-categories';

describe('navigateToCategory', () => {

  it('should provide the right event type', () => {
    assert.equal(navigateToCategory('all').type, forumCatConstants.NAVIGATE_TO_CATEGORY);
  });

  it('should provde the right route value', () => {
    assert.equal(navigateToCategory('all').route, 'forum');
  });

  it('throw an error if no category is provided', (done) => {
    try { navigateToCategory() }
    catch(e) {
      assert.equal(e.message, 'navigateToCategory must be called with a category value');
      done();
    }
  });

  it('should provide the right category when specified', () => {
    assert.equal(navigateToCategory('all').category, 'all');
  });

});
