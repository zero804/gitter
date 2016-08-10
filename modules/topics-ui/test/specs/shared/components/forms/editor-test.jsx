"use strict";

import { equal } from 'assert';
import React from 'react';
import { shallow } from 'enzyme';
import Editor from '../../../../../shared/components/forms/editor.jsx';

describe('<Editor/>', () => {

  let wrapper;

  beforeEach(() => {
    wrapper = shallow(<Editor className="test"/>);
  });

  it('should render a text area', () => {
    equal(wrapper.find('textarea').length, 1);
  });

  it('should render an .editor class', () => {
    equal(wrapper.find('.editor').length, 1);
  });

  it('should render a custom class if provided', () => {
    equal(wrapper.find('.test').length, 1);
  });

});
