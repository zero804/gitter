"use strict";

import {equal} from 'assert';
import React from 'react';
import { mount } from 'enzyme';
import UserAvatar from '../../../../../shared/components/user/user-avatar.jsx';

describe('<UserAvatar/>', () => {

  let wrapper;
  const avatarUrl = 'test';
  const userDisplayName = 'test-name';
  const dim = 10;

  beforeEach(() => {
    wrapper = mount(
      <UserAvatar
        width={dim}
        height={dim}
        user={{
          avatarUrl: avatarUrl,
          displayName: userDisplayName
        }}/>
    );
  });

  it('should render an avatar', () => {
    equal(wrapper.find('Avatar').length, 1);
  });

  it('should render an image with the correct title', () => {
    equal(wrapper.find('img').at(0).prop('title'), userDisplayName);
  });

  it('should render an avatar--user class', () => {
    equal(wrapper.find('.avatar--user').length, 1);
  });

  it('should set a passed height', () => {
    equal(wrapper.find('img').at(0).prop('height'), dim);
  });

  it('should set a passed width', () => {
    equal(wrapper.find('img').at(0).prop('width'), dim);
  });

});
