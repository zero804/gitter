import assert from 'assert';
import React from 'react';
import sinon from 'sinon';
import { shallow } from 'enzyme';
import CategoryListItem from '../../../../../../shared/containers/components/forum/category-list-item.jsx';

describe('<CategoryListItem />', function(){

  let wrapper;
  let clickHandle = sinon.spy();
  beforeEach(function(){
    wrapper = shallow(<CategoryListItem category="test" active={false} onClick={clickHandle} groupUri='gitterHQ' />);
  });

  it('should render the correct class', function(){
    assert.equal(wrapper.find('.category-list__item').length, 1);
  });

});
