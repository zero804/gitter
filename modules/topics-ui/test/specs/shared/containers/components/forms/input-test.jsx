import { equal } from 'assert';
import React from 'react';
import sinon from 'sinon';
import { shallow } from 'enzyme';
import Input from '../../../../../../shared/containers/components/forms/input.jsx';
import mockEvt from '../../../../../mocks/event';

describe('<Input/>', () => {

  let wrapper;
  let inputHandle;

  beforeEach(() => {
    inputHandle = sinon.spy();
    wrapper = shallow(
      <Input
        name="test"
        className="input--test"
        placeholder="test"
        onChange={inputHandle}/>
    );
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

  it('should call onChange after a change event', () => {
    wrapper.find('input').at(0).simulate('change', mockEvt);
    equal(inputHandle.callCount, 1);
  });

});
