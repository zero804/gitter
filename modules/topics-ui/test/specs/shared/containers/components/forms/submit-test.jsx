import {equal} from 'assert';
import React from 'react';
import { shallow } from 'enzyme';
import Submit from '../../../../../../shared/containers/components/forms/submit.jsx';

describe('<Submit/>', () => {

  let wrapper;

  beforeEach(() => {
    wrapper = shallow(<Submit className="test"/>);
  });

  it('should render a button', () => {
    equal(wrapper.find('button').length, 1);
  });

  it('should render abutton with a type of submit', () => {
    equal(wrapper.find('button').at(0).prop('type'), 'submit');
  });

  it('should render a className of submit-button', () => {
     equal(wrapper.find('.submit-button').length, 1);
  });

  it('should render a custom className if provided', () => {
      equal(wrapper.find('.test').length, 1);
  });

});
