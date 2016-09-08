import assert from 'assert';
import React from 'react';
import sinon from 'sinon';
import { shallow, mount } from 'enzyme';
import CategoryListItem from '../../../../../../shared/containers/components/forum/category-list-item.jsx';

describe('<CategoryListItem />', function(){

  let wrapper;
  let clickHandle = sinon.spy();
  beforeEach(function(){
    wrapper = shallow(<CategoryListItem category="test" active={false} onClick={clickHandle} groupName='gitterHQ' />);
  });

  it('should render the correct class', function(){
    assert.equal(wrapper.find('.category-list__item').length, 1);
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
