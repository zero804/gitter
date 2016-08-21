import { equal } from 'assert';
import React from 'react';
import { shallow } from 'enzyme';
import Input from '../../../../../../shared/containers/components/forms/input.jsx';

describe('<Input/>', () => {

  let wrapper;

  beforeEach(() => {
    wrapper = shallow(<Input name="test" className="input--test" placeholder="test" />);
  });

  it('should render an input', () => {
    equal(wrapper.find('input').length, 1);
  });

  it('should have a class of input', () => {
    equal(wrapper.find('.input').length, 1);
  });

  it('should pass doen the name attribute', () => {
    equal(wrapper.find('input').prop('name'), 'test');
  });

  it('should pass a custom class', () => {
    equal(wrapper.find('.input--test').length, 1)
  });

  it('should pass a placeholder', () => {
    equal(wrapper.find('input').prop('placeholder'), 'test');
  });

});
