"use strict";

var assert = require('assert');
var Backbone = require('backbone');
var React = require('react');
var { shallow } = require('enzyme');
var ForumContainer = require('../../../containers/ForumContainer.jsx');
var { subscribe } = require('../../../browser/js/dispatcher');
var navConstants = require('../../../browser/js/constants/navigation');

var Collection = Backbone.Collection.extend({
  getCategories(){ return this.models.map((m) => m.toJSON() ); }
});

describe('<ForumContainer />', function(){

  let wrapper;
  let collection;

  beforeEach(function(){
    collection = new Collection([ { category: 'all', active: true } ]);
    wrapper = shallow(<ForumContainer categoryStore={collection} groupName='gitterHQ' />);
  });

  it('should dispatch the right action when a category is clicked', function(done){

    subscribe(navConstants.NAVIGATE_TO, function(data){
      assert.equal(data.route, 'forum');
      assert.equal(data.category, 'all');
      done();
    });

    wrapper.find('CategoryList').prop('onCategoryClicked')('all');

  });

});
