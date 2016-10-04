import {equal} from 'assert';
import React from 'react';
import { shallow } from 'enzyme';
import Avatar from '../../../../../shared/containers/components/avatar.jsx';
import {AVATAR_SIZE_SMALL} from '../../../../../shared/constants/avatar-sizes';

describe('<Avatar/>', () => {

  let wrapper;

  beforeEach(() => {
    wrapper = shallow(
    <Avatar
      size={AVATAR_SIZE_SMALL}
      src="test"
      className="test" />
    );
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

});
