import assert from 'assert';
import sinon from 'sinon';
import * as forumTagConstants from '../../../../shared/constants/forum-tags';
import mockRouter from '../../../mocks/router';
import tags from '../../../mocks/mock-data/tags';

import injector from 'inject-loader!../../../../browser/js/stores/forum-tag-store';
const {getForumTagStore} = injector({
  '../routers/index': mockRouter
});

describe('TagStore', () => {

  let tagStore;
  let handle;

  beforeEach(function(){
    handle = sinon.spy();
    tagStore = getForumTagStore(tags);
  });


  it('should update the active element when the route changes', function(){
    mockRouter.set('tagName', 1);
    assert.equal(tagStore.at(0).get('active'), false);
    assert(tagStore.at(1).get('active'));
  });

  //This passes when run with only ... ?
  it.skip('should dispatch un active:update event when the active tag changes', function(){
    tagStore.on(forumTagConstants.UPDATE_ACTIVE_TAG, handle)
    mockRouter.set('tagName', 1);
    assert.equal(handle.callCount, 1);
  });

  it('should get tags by values', () => {
    const values = [ tags[0].label, tags[1].label ];
    const result = tagStore.getTagsByLabel(values);
    assert.equal(result.length, values.length);
    result.forEach((t, i) => {
      assert.equal(t.label, values[i]);
      assert(t.value);
    });
  });

});
