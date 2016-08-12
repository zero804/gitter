"use strict";

var {equal} = require('assert');
var {shallow} = require('enzyme');
var Backbone = require('backbone');
var React = require('react');
var TopicContainer = require('../../../containers/TopicContainer.jsx');

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

});
