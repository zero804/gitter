import assert from 'assert';
import navigateToSort from '../../../../../shared/action-creators/forum/navigate-to-sort';
import * as forumSortConstants from '../../../../../shared/constants/forum-sorts';

describe('navigateToSort', () => {

  it('should throw an error if no filter is provided', (done) => {
    try{ navigateToSort() }
    catch(e){
      assert.equal(e.message, 'navigateToSort must be called with a valid sort');
      done();
    }
  });

  it('should provide the right event type', () => {
    assert.equal(navigateToSort('all').type, forumSortConstants.NAVIGATE_TO_SORT);
  });

  it('should provide the right route value', () => {
    assert.equal(navigateToSort('all').route, 'forum');
  });

  it('should provide the right sort value', () => {
    assert.equal(navigateToSort('all').sort, 'all');
  });

});
