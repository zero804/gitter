import {ok} from 'assert';
import Store from '../../../../browser/js/stores/forum-store';

describe('ForumStore', () => {

  let store;
  beforeEach(() => {
    store = new Store();
  });

  it('should have at least one test', () => {
    ok(store);
  });

});
