import {equal} from 'assert';
import newTopicStore from '../../../../server/stores/new-topic-store';

describe('newTopicStore', () => {

  var data = {};

  it('should an object with getNewTopic', () => {
    assert(newTopicStore(data).get);
  });

});
