import {equal} from 'assert';
import forumStore from '../../../../server/stores/forum-store';

describe('forumStore', () => {

  var data = {};

  it('should an object with getForum', () => {
    assert(forumStore(data).get);
  });

});
