import assert, { equal } from 'assert';
import React from 'react';
import sinon, {spy} from 'sinon';
import { shallow } from 'enzyme';
import ForumContainer from '../../../../shared/containers/ForumContainer.jsx';
import { subscribe } from '../../../../shared/dispatcher';

import * as forumCatConstants from '../../../../shared/constants/forum-categories';
import * as forumFilterConstants from '../../../../shared/constants/forum-filters';
import * as forumSortConstants from '../../../../shared/constants/forum-sorts';
import * as forumTagConstants from '../../../../shared/constants/forum-tags';
import * as createConst from '../../../../shared/constants/create-topic';

import categoryStore from '../../../mocks/category-store';
import tagStore from '../../../mocks/tag-store';
import topicsStore from '../../../mocks/topic-store';
import newTopicStore from '../../../mocks/new-topic-store';

describe.skip('<ForumContainer />', function(){

  let wrapper;
  let catChangeHandle;
  let filterChangeHandle;
  let sortChangeHandle;
  let tagChangeHandle;


  beforeEach(function(){
    catChangeHandle = sinon.spy();
    filterChangeHandle = sinon.spy();
    sortChangeHandle = sinon.spy();
    tagChangeHandle = sinon.spy();
    wrapper = shallow(
      <ForumContainer
        categoryStore={categoryStore}
        categoryName="all"
        tagStore={tagStore}
        topicsStore={topicsStore}
        newTopicStore={newTopicStore}
        groupUri='gitterHQ' />
    );
  });

  it('should dispatch the right action when a filter changes', () => {
    subscribe(forumFilterConstants.NAVIGATE_TO_FILTER, filterChangeHandle);
    wrapper.find('ForumTableControl').prop('filterChange')('all');
    assert.equal(filterChangeHandle.callCount, 1);
  });

  it('should dispatch the right action when a sort changes', () => {
    subscribe(forumSortConstants.NAVIGATE_TO_SORT, sortChangeHandle);
    wrapper.find('ForumTableControl').prop('sortChange')('all');
    assert.equal(sortChangeHandle.callCount, 1);
  });

  it('should dispatch the right action when a tag changes', () => {
    subscribe(forumTagConstants.NAVIGATE_TO_TAG, tagChangeHandle);
    wrapper.find('ForumTableControl').prop('tagChange')('all');
    assert.equal(tagChangeHandle.callCount, 1);
  });

  it('should render a TopicsTable', () => {
    assert.equal(wrapper.find('TopicsTable').length, 1);
  });

  it('should render a search header', () => {
    assert.equal(wrapper.find('SearchHeader').length, 1);
  });

  it('should render the create topic modal', () => {
    equal(wrapper.find('CreateTopicModal').length, 1);
  });

  it('should dispatch a title update event when the title updates', () => {
    const handle = spy();
    subscribe(createConst.TITLE_UPDATE, handle);
    wrapper.find('CreateTopicModal').at(0).prop('onTitleChange')('This is a topic');
    equal(handle.callCount, 1);
  });

  it('should dispatch a title update event when the title updates', () => {
    const handle = spy();
    subscribe(createConst.BODY_UPDATE, handle);
    wrapper.find('CreateTopicModal').at(0).prop('onBodyChange')('This is some body copy');
    equal(handle.callCount, 1);
  });

  //Passes when run with .only
  it.skip('should dispatch the right event when the form is submitted', () => {
    const handle = spy();
    subscribe(createConst.SUBMIT_NEW_TOPIC, handle);
    wrapper.find('CreateTopicModal').at(0).prop('onSubmit')()
    equal(handle.callCount, 1);
  });

  it('should dispatch the right action when the create topic category changes', () => {
    const handle = spy();
    subscribe(createConst.CATEGORY_UPDATE, handle);
    wrapper.find('CreateTopicModal').at(0).prop('onCategoryChange')('1');
    equal(handle.callCount, 1);
  });

  it('should dispatch the right action then the create topic tags change', () => {
    const handle = spy();
    subscribe(createConst.TAGS_UPDATE, handle);
    wrapper.find('CreateTopicModal').at(0).prop('onTagsChange')(['1', '2', '3']);
    equal(handle.callCount, 1);
  });

});
