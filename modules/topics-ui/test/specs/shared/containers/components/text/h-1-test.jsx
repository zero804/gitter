import { equal } from 'assert';
import React from 'react';
import { shallow } from 'enzyme';
import H1 from '../../../../../../shared/containers/components/text/h-1.jsx';

describe('<H1/>', () => {

  let wrapper;

  beforeEach(() => {
    wrapper = shallow(<H1 className="h1--test"/>);
  });

  it('should render a h1 element', () => {
    equal(wrapper.find('h1').length, 1);
  });

  it('should render a .h1 class', () => {
    equal(wrapper.find('.h1').length, 1);
  });

  it('should pass down the className', () => {
    equal(wrapper.find('.h1--test').length, 1)
  });

});
