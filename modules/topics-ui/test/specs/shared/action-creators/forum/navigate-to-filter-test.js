import assert from 'assert';
import navigateToFilter from '../../../../../shared/action-creators/forum/navigate-to-filter';
import * as forumFilterConstants from '../../../../../shared/constants/forum-filters';

describe('navigateToFilter', () => {

  it('should throw an error if no filter is provided', (done) => {
    try{ navigateToFilter() }
    catch(e){
      assert.equal(e.message, 'navigateToFilter must be called with a valid filter');
      done();
    }
  });

  it('should provide the right event type', () => {
    assert.equal(navigateToFilter('all').type, forumFilterConstants.NAVIGATE_TO_FILTER);
  });

  it('should provide the right route value', () => {
    assert.equal(navigateToFilter('all').route, 'forum');
  });

  it('should provide the right filter value', () => {
    assert.equal(navigateToFilter('all').filter, 'all');
  });

});
