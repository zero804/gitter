"use strict";

var assert = require('assert');
var React = require('react');
var sinon = require('sinon');
var { shallow } = require('enzyme');
var CategoryListItem = require('../../../../../shared/components/forum/category-list-item.jsx');

describe('<CategoryListItem />', function(){

  let wrapper;
  let clickHandle = sinon.spy();
  beforeEach(function(){
    wrapper = shallow(<CategoryListItem category="test" active={false} onClick={clickHandle} groupName='gitterHQ' />);
  });

  it('should render a anchor', function(){
    assert.equal(wrapper.find('a').length, 1);
  });

  it('should render the correct class', function(){
    assert.equal(wrapper.find('.category-list__item').length, 1);
  });

  it('should render the correct class in the active state', function(){
    wrapper = shallow(<CategoryListItem category="test" active={true} onClick={() => true} groupName='gitterHQ' />);
    assert.equal(wrapper.find('.category-list__item--active').length, 1);
  });

  it('should call the click handler when clicked', function(){
    wrapper.find('a').simulate('click');
    assert.equal(clickHandle.callCount, 1);
  });

  it('should call the click handle with the correct arguments', function(){
    wrapper.find('a').simulate('click');
    assert(clickHandle.calledWith('test'));
  });

  it('should generate the right href', function(){
    var href = wrapper.find('a').prop('href');
    assert.equal(href, '/gitterHQ/topics/categories/test');
  });

  it('should generate the right title', function(){
    var title = wrapper.find('a').prop('title');
    assert.equal(title, 'test topics');
  });

});
