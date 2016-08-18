import {equal} from 'assert';
import {shallow} from 'enzyme';
import Backbone from 'backbone';
import React from 'react';
import TopicContainer from '../../../../shared/containers/TopicContainer.jsx';

var TopicStore = Backbone.Collection.extend({
  getById(){ return this.at(0).toJSON(); }
});

describe('<TopicContainer />', () => {

  let wrapper;
  let topicsStore;

  beforeEach(function(){
    topicsStore = new TopicStore({ id: 1 }, { id: 2 });
    wrapper = shallow(<TopicContainer topicsStore={topicsStore} topicId={1} />);
  });

  it('should render a TopicHeader component', () => {
    equal(wrapper.find('TopicHeader').length, 1);
  });

  it('should render a TopicBody', () => {
    equal(wrapper.find('TopicBody').length, 1);
  });

});
