import assert from 'assert';
import Backbone from 'backbone';
import React from 'react';
import { shallow } from 'enzyme';
import ForumContainer from 'gitter-web-topics-ui/containers/ForumContainer.jsx';
import { subscribe } from 'gitter-web-topics-ui/shared/dispatcher';
import navConstants from 'gitter-web-topics-ui/shared/constants/navigation';

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
