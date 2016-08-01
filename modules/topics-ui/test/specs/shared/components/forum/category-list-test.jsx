"use strict";

var assert = require('assert');
var React = require('react');
var { shallow } = require('enzyme');
var CategoryList = require('../../../../../shared/components/forum/category-list.jsx');
var Container = require('../../../../../shared/components/container.jsx');
var Panel = require('../../../../../shared/components/panel.jsx');

describe('<CategoryList />', function(){

  const categories = [ 1, 2, 3, 4];
  let wrapper;
  beforeEach(function(){
    wrapper = shallow(<CategoryList categories={categories} />);
  });

  it('should render a single container', function(){
    assert.equal(wrapper.find(Container).length, 1);
  });

  it('should render a single panel', function(){
    assert.equal(wrapper.find(Panel).length, 1);
  });

  it('should render a single ui', function(){
    assert.equal(wrapper.find('ul').length, 1);
  });

  it('should render a li for each child', function(){
    assert.equal(wrapper.find('li').length, categories.length);
  });

});
