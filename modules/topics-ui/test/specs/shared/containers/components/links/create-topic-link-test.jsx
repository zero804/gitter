import {equal} from 'assert';
import {spy} from 'sinon';
import React from 'react';
import { shallow } from 'enzyme';
import CreateTopicLink from '../../../../../../shared/containers/components/links/create-topic-link.jsx';
import {subscribe} from '../../../../../../shared/dispatcher';
import {NAVIGATE_TO_CREATE_TOPIC} from '../../../../../../shared/constants/create-topic';
import mockEvt from '../../../../../mocks/event';

describe('<CreateTopicLink/>', () => {

  let wrapper;

  beforeEach(() => {
    wrapper = shallow(
      <CreateTopicLink groupUri="gitterHQ" className="test">
      This is a link
      </CreateTopicLink>
    );
  });

  it('should render an anchor', () => {
    equal(wrapper.find('a').length, 1);
  });

  it('should have the right title', () => {
    equal(wrapper.find('a').at(0).prop('title'), 'Create a new topic');
  });

  it('should render the a with the right href', () => {
    equal(wrapper.find('a').at(0).prop('href'), '/gitterHQ/topics/create-topic');
  });

  it('should dispatch the right event when the anchor is clicked', () => {
    const handle = spy();
    subscribe(NAVIGATE_TO_CREATE_TOPIC, handle);
    wrapper.find('a').at(0).simulate('click', mockEvt);
    equal(handle.callCount, 1);
  });

  it('should apply custom class names', () => {
    equal(wrapper.find('.test').length, 1);
  });

});
