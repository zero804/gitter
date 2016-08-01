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
    wrapper = shallow(<CategoryListItem category="test" active={false} onClick={clickHandle} />);
  });

  it('should render a button', function(){
    assert.equal(wrapper.find('button').length, 1);
  });

  it('should render the correct class', function(){
    assert.equal(wrapper.find('.subdued-button-clouds--xsmall').length, 1);
  });

  it('should render the correct class in the active state', function(){
    wrapper = shallow(<CategoryListItem category="test" active={true} onClick={() => true} />);
    assert.equal(wrapper.find('.button-clouds--xsmall').length, 1);
  });

  it('should call the click handler when clicked', function(){
    wrapper.find('button').simulate('click');
    assert.equal(clickHandle.callCount, 1);
  });

  it('should call the click handle with the correct arguments', function(){
    wrapper.find('button').simulate('click');
    assert(clickHandle.calledWith('test'));
  });

});
