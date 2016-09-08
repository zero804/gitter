import {ok} from 'assert';
import * as store from '../../../../browser/js/stores/forum-store';

describe('ForumStore', () => {

  it('should export a getForumStore function', () => {
    ok(store.getForumStore);
  });

  it('should expose a getForum function on the store', () => {
    const s = store.getForumStore();
    ok(s.getForum);
  });

  it('should expose a getForum function', () => {
    ok(store.getForum);
  });

  it('should expose a getForumId function', () => {
    ok(store.getForumId);
  });

});
