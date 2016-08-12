"use strict";

import {equal} from 'assert';
import React from 'react';
import { shallow } from 'enzyme';
import Avatar from '../../../../shared/components/avatar.jsx';

describe('<Avatar/>', () => {

  let wrapper;
  const dim = 10;

  beforeEach(() => {
    wrapper = shallow(<Avatar src="test" className="test" height={dim} width={dim}/>);
  });

  it('should render an image element', () => {
    equal(wrapper.find('img').length, 1);
  });

  it('should pass the src attribute', () => {
    equal(wrapper.find('img').at(0).prop('src'), 'test');
  });

  it('should provide an avatar class', () => {
    equal(wrapper.find('.avatar').length, 1);
  });

  it('should render a className if provided', () => {
    equal(wrapper.find('.test').length, 1);
  });

  it('should set the correct height', () => {
    equal(wrapper.find('img').at(0).prop('height'), dim);
  });

  it('should set the correct width', () => {
    equal(wrapper.find('img').at(0).prop('width'), dim);
  });

});
