import assert from 'assert';
import sinon from 'sinon';
import Backbone from 'backbone';
import ForumTagStore from '../../../../browser/js/stores/forum-tag-store';
import * as forumTagConstants from '../../../../shared/constants/forum-tags';

describe('TagStore', () => {

  let tags;
  let tagStore;
  let router;
  let handle;

  beforeEach(function(){
    handle = sinon.spy();
    tags = [
      {value: 'all-tags', name: 'All Tags', active: true },
      {value: 1, name: 1, active: false },
      {value: 2, name: 2, active: false },
      {value: 3, name: 3, active: false },
    ];
    router = new Backbone.Model({ route: 'forum', tagName: 'all-tags' });
    tagStore = new ForumTagStore(tags, { router: router });
  });


  it('should update the active element when the route changes', function(){
    router.set('tagName', 1);
    assert.equal(tagStore.at(0).get('active'), false);
    assert(tagStore.at(1).get('active'));
  });

  it('should dispatch un active:update event when the active tag changes', function(){
    tagStore.on(forumTagConstants.UPDATE_ACTIVE_TAG, handle)
    router.set('tagName', 1);
    assert.equal(handle.callCount, 1);
  });

});
