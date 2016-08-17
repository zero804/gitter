"use strict";

var assert = require('assert');
var Backbone = require('backbone');
var React = require('react');
var { shallow } = require('enzyme');
var ForumContainer = require('gitter-web-topics-ui/containers/ForumContainer.jsx');
var { subscribe } = require('gitter-web-topics-ui/shared/dispatcher');
var navConstants = require('gitter-web-topics-ui/shared/constants/navigation');

var Collection = Backbone.Collection.extend({
  getCategories(){
    return this.models.map((m) => m.toJSON());
  }
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
