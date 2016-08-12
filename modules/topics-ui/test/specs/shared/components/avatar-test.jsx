"use strict";

import {equal} from 'assert';
import React from 'react';
import { shallow } from 'enzyme';
import Avatar from '../../../../shared/components/avatar.jsx';

describe('<Avatar/>', () => {

  let wrapper;

  beforeEach(() => {
    wrapper = shallow(<Avatar src="test"/>);
  });

  it('should render an image element', () => {
    equal(wrapper.find('img').length, 1);
  });

  it('should pass the src attribute', () => {
    equal(wrapper.find('img').at(0).prop('src'), 'test');
  });

});
