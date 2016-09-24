import assert from 'assert';
import {dispatch} from '../../../../shared/dispatcher';
import {RepliesStore} from '../../../../browser/js/stores/replies-store';

import forumStore from '../../../mocks/forum-store';
import replies from '../../../mocks/mock-data/replies';
import router from '../../../mocks/router';

import navigateToTopic from '../../../../shared/action-creators/topic/navigate-to-topic';
import updateReply from '../../../../shared/action-creators/topic/update-reply';
import cancelUpdateReply from '../../../../shared/action-creators/topic/cancel-update-reply';

describe('RepliesStore', () => {

  let store;
  beforeEach(() => {
    store = new RepliesStore(replies, {
      forumStore: forumStore,
      router: router
    });
  });

  it('should provide a getReplies()', () => {
    assert(store.getReplies);
  });

  it('should reset when navigating to topic', () => {
    assert(store.length);
    dispatch(navigateToTopic());
    assert.equal(store.length, 0);
  });

  it('should update a model when the updateReply action is dispatched', () => {
    dispatch(updateReply('1', 'test'));
    const result = store.get('1').get('text');
    assert.equal(result, 'test');
  });

  it('should reset the text value when a cancel edit action is called', () => {
    dispatch(updateReply('1', 'test'));
    assert.equal(store.get('1').get('text'), 'test');
    dispatch(cancelUpdateReply('1'));
    assert.equal(store.get('1').get('text'), null);
  });

  //TODO test the save actions

});
