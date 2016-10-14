import assert from 'assert';
import { spy } from 'sinon';
import React from 'react';
import { shallow } from 'enzyme';
import ForumFollowArea from '../../../../../../shared/containers/components/forum/forum-follow-area.jsx';

import {
  SUBSCRIPTION_STATE_UNSUBSCRIBED,
} from '../../../../../../shared/constants/forum.js';

describe('<ForumFollowArea/>', () => {

  let wrapper;
  let clickHandle;

  beforeEach(() => {
    clickHandle = spy();
    wrapper = shallow(
      <ForumFollowArea
        groupName="gitterHQ"
        subscriptionState={SUBSCRIPTION_STATE_UNSUBSCRIBED}
        onSubscriptionClicked={clickHandle}/>
    );
  });

  it('should render', () => {
    assert(wrapper.length);
  });

  it('should render a container', () => {
    assert(wrapper.find('Container').length);
  });

  it('should render a panel', () => {
    assert(wrapper.find('Panel').length);
  });

  it('should render a FollowButton', () => {
    assert(wrapper.find('FollowButton').length);
  });

  it('should call the correct callback when the FollowButton is clicked', () => {
    wrapper.find('FollowButton').at(0).prop('onClick')();
    assert.equal(clickHandle.callCount, 1);
  });

  it('should render a custom class on the panel', () => {
    const result = wrapper.find('Panel').at(0).prop('className');
    assert.equal(result, 'panel--forum-follow-area');
  });

  it('should render a custom class on the FollowButton', () => {
    const result = wrapper.find('FollowButton').at(0).prop('className');
    assert.equal(result, 'forum-follow-area-button');
  });

});
