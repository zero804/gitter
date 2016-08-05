"use strict";

var assert = require('assert');
var Backbone = require('backbone');
var React = require('react');
var sinon = require('sinon');
var { shallow } = require('enzyme');
var ForumContainer = require('../../../containers/ForumContainer.jsx');
var { subscribe } = require('../../../browser/js/dispatcher');
var navConstants = require('../../../browser/js/constants/navigation');

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

  beforeEach(function(){
    catChangeHandle = sinon.spy();
    catCollection = new CategoryCollection([ { category: 'all', active: true } ]);
    tagCollection = new TagCollection([{value: 'all-tags', name: 'All Tags', active: true }])
    wrapper = shallow(<ForumContainer categoryStore={catCollection} tagStore={tagCollection} groupName='gitterHQ' />);
  });

  it('should dispatch the right action when a category is clicked', function(){
    subscribe(navConstants.NAVIGATE_TO, catChangeHandle);
    wrapper.find('CategoryList').prop('onCategoryClicked')('all');
    assert.equal(catChangeHandle.callCount, 1);
  });

});
