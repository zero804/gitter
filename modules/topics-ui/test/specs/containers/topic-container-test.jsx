"use strict";

var {equal} = require('assert');
var {shallow} = require('enzyme');
var React = require('react');
var TopicContainer = require('../../../containers/TopicContainer.jsx');

describe('<TopicContainer />', () => {

  let wrapper;
  beforeEach(function(){
    wrapper = shallow(<TopicContainer />);
  });

  it('should render a TopicHeader component', () => {
    equal(wrapper.find('TopicHeader').length, 1);
  });

});
