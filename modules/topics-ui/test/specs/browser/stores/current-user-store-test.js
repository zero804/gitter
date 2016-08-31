import assert from 'assert';
import Store from '../../../../browser/js/stores/current-user-store';

describe('CurrentUserStore', () => {

  let store;
  beforeEach(() => {
    store = new Store();
  });

  it('should pass a test', () => {
    assert(true);
  });

});
