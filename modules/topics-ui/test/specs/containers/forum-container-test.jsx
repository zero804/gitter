"use strict";

var assert = require('assert');
var Backbone = require('backbone');
var React = require('react');
var sinon = require('sinon');
var { shallow } = require('enzyme');
var ForumContainer = require('../../../containers/ForumContainer.jsx');
var { subscribe } = require('../../../browser/js/dispatcher');
var navConstants = require('../../../browser/js/constants/navigation');
var forumFilterConstants = require('../../../browser/js/constants/forum-filters');
var forumSortConstants = require('../../../browser/js/constants/forum-sorts');

//TODO move these into mock objects
var CategoryCollection = Backbone.Collection.extend({
  getCategories(){ return this.models.map((m) => m.toJSON() ); }
});
var TagCollection = Backbone.Collection.extend({
  getTags(){ return this.models.map((m) => m.toJSON() ); }
});

describe('<ForumContainer />', function(){

  let wrapper;
  let catCollection;
  let tagCollection;
  let catChangeHandle;
  let filterChangeHandle;
  let sortChangeHandle;

  beforeEach(function(){
    catChangeHandle = sinon.spy();
    filterChangeHandle = sinon.spy();
    sortChangeHandle = sinon.spy();
    catCollection = new CategoryCollection([ { category: 'all', active: true } ]);
    tagCollection = new TagCollection([{value: 'all-tags', name: 'All Tags', active: true }])
    wrapper = shallow(<ForumContainer categoryStore={catCollection} tagStore={tagCollection} groupName='gitterHQ' />);
  });

  it('should dispatch the right action when a category is clicked', function(){
    subscribe(navConstants.NAVIGATE_TO, catChangeHandle);
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

});
