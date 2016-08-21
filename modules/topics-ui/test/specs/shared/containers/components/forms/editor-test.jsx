import { equal } from 'assert';
import React from 'react';
import { shallow } from 'enzyme';
import Editor from '../../../../../../shared/containers/components/forms/editor.jsx';

describe('<Editor/>', () => {

  let wrapper;

  beforeEach(() => {
    wrapper = shallow(<Editor className="test" name="test"/>);
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

  it('should pass down a name if provided', () => {
      equal(wrapper.find('textarea').at(0).prop('name'), 'test');
  });

});
