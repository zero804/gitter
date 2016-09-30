import { equal, deepEqual } from 'assert';
import React from 'react';
import { mount } from 'enzyme';
import { spy } from 'sinon';

import ReactionButton from '../../../../../../shared/containers/components/forum/reaction-button.jsx';
import * as reactionConstants from '../../../../../../shared/constants/reactions';

describe('<ReactionButton/>', () => {

  let wrapper;
  let onReactionPickHandle;

  beforeEach(() => {
    onReactionPickHandle = spy();
    wrapper = mount(<ReactionButton
      onReactionPick={onReactionPickHandle} />);
  });

  it('should render a RawReactionButton', () => {
    equal(wrapper.find('RawReactionButton').length, 1);
  });

  it('calls `onReactionPick` callback attribute', () => {
    wrapper.simulate('click');
    equal(onReactionPickHandle.callCount, 1);
    var args = onReactionPickHandle.getCall(0).args;
    equal(args.length, 2);
    deepEqual(args, [reactionConstants.LIKE, true]);
  });
});
