import assert from 'assert';
import Store from '../../../../browser/js/stores/current-user-store';

describe('CurrentUserStore', () => {

  let store;
  beforeEach(() => {
    store = new Store();
  });

  it('getCurrentUser', () => {
    const msg = 'should contain a getCurrentUser function';
    assert(store.getCurrentUser, msg);
  });

});
