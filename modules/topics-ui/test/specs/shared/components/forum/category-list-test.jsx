"use strict";

var assert = require('assert');
var React = require('react');
var { shallow } = require('enzyme');
var CategoryList = require('../../../../../shared/components/forum/category-list.jsx');
var Container = require('../../../../../shared/components/container.jsx');

describe('<CategoryList />', function(){

  it('should render a single container', function(){
    const wrapper = shallow(<CategoryList />);
    assert.equal(wrapper.find(Container).length, 1);
  });

});
