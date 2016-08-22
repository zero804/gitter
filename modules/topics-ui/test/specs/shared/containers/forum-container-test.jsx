import assert from 'assert';
import Backbone from 'backbone';
import React from 'react';
import sinon from 'sinon';
import { shallow } from 'enzyme';
import ForumContainer from '../../../../shared/containers/ForumContainer.jsx';
import { subscribe } from '../../../../shared/dispatcher';
import * as forumCatConstants from '../../../../shared/constants/forum-categories';
import * as forumFilterConstants from '../../../../shared/constants/forum-filters';
import * as forumSortConstants from '../../../../shared/constants/forum-sorts';
import * as forumTagConstants from '../../../../shared/constants/forum-tags';
import categoryStore from '../../../mocks/category-store';
import tagStore from '../../../mocks/tag-store';
import topicsStore from '../../../mocks/topic-store';
import newTopicStore from '../../../mocks/new-topic-store';

describe('<ForumContainer />', function(){

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
        groupName='gitterHQ' />
    );
  });

  it('should dispatch the right action when a category is clicked', function(){
    subscribe(forumCatConstants.NAVIGATE_TO_CATEGORY, catChangeHandle);
    wrapper.find('CategoryList').prop('onCategoryClicked')('all');
    assert.equal(catChangeHandle.callCount, 1);
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

  it('should render a CreateTopicContainer', () => {
    assert.equal(wrapper.find('CreateTopicContainer').length, 1);
  });

  it('should render a TopicsTable', () => {
    assert.equal(wrapper.find('TopicsTable').length, 1);
  });

});
