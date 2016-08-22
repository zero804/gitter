import assert from 'assert';
import sinon from 'sinon';
import ForumTagStore from '../../../../browser/js/stores/forum-tag-store';
import * as forumTagConstants from '../../../../shared/constants/forum-tags';
import mockRouter from '../../../mocks/router';
import tags from '../../../mocks/data/tags';

describe('TagStore', () => {

  let tagStore;
  let handle;

  beforeEach(function(){
    handle = sinon.spy();
    tagStore = new ForumTagStore(tags, { router: mockRouter });
  });


  it('should update the active element when the route changes', function(){
    mockRouter.set('tagName', 1);
    assert.equal(tagStore.at(0).get('active'), false);
    assert(tagStore.at(1).get('active'));
  });

  it('should dispatch un active:update event when the active tag changes', function(){
    tagStore.on(forumTagConstants.UPDATE_ACTIVE_TAG, handle)
    mockRouter.set('tagName', 1);
    assert.equal(handle.callCount, 1);
  });

});
