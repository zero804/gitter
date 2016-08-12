"use strict";

import {equal} from 'assert';
import React from 'react';
import { mount } from 'enzyme';
import UserAvatar from '../../../../../shared/components/user/user-avatar.jsx';

describe('<UserAvatar/>', () => {

  let wrapper;
  const avatarUrl = 'test';
  const userDisplayName = 'test-name';

  beforeEach(() => {
    wrapper = mount(<UserAvatar user={{ avatarUrl: avatarUrl, displayName: userDisplayName}}/>);
  });

  it('should render an avatar', () => {
    equal(wrapper.find('Avatar').length, 1);
  });

  it('should render an image with the correct title', () => {
    equal(wrapper.find('img').at(0).prop('title'), userDisplayName);
  });

});
