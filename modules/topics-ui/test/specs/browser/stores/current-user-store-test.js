import {ok} from 'assert';
import * as store from '../../../../browser/js/stores/current-user-store';

describe('CurrentUserStore', () => {

  it('it should expose a getCurrentUserStore function', () => {
    ok(store.getCurrentUserStore);
  });

  it('should export a getCurrentUser function', () => {
    const user = store.getCurrentUserStore();
    ok(user.getCurrentUser);
  });

});
