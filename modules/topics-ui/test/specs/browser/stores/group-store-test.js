import {ok} from 'assert';
import * as store from '../../../../browser/js/stores/group-store';

describe('GroupStore', () => {

  it('should export a getGroupStore function', () => {
    ok(store.getGroupStore);
  });

  it('should expose a getGroup function on the store', () => {
    const s = store.getGroupStore();
    ok(s.getGroup);
  });

  it('should expose a getGroupId function on the store', () => {
    const s = store.getGroupStore();
    ok(s.getGroupId);
  });

  it('should expose a getGroupUri function on the store', () => {
    const s = store.getGroupStore();
    ok(s.getGroupUri);
  });

  it('should expose a getGroupName function on the store', () => {
    const s = store.getGroupStore();
    ok(s.getGroupName);
  });



  it('should expose a getGroup function', () => {
    ok(store.getGroup);
  });

  it('should expose a getGroupId function', () => {
    ok(store.getGroupId);
  });

  it('should expose a getGroupUri function', () => {
    ok(store.getGroupUri);
  });

  it('should expose a getGroupName function', () => {
    ok(store.getGroupName);
  });

});
