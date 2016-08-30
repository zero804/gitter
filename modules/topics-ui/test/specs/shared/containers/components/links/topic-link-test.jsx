import {equal} from 'assert';
import React from 'react';
import {spy} from 'sinon';
import { shallow } from 'enzyme';
import TopicLink from '../../../../../../shared/containers/components/links/topic-link.jsx';
import {subscribe} from '../../../../../../shared/dispatcher';
import {NAVIGATE_TO_TOPIC} from '../../../../../../shared/constants/navigation.js';
import mockEvt from '../../../../../mocks/event';
import categories from '../../../../../mocks/mock-data/categories';

describe('<TopicLink/>', () => {

  let wrapper;
  const topic = categories[0];

  beforeEach(() => {
    wrapper = shallow(
      <TopicLink
          groupName='gitterHQ'
          topic={topic}>
        Some content
      </TopicLink>
    );
  });

  it('should render an anchor', () => {
    equal(wrapper.find('a').length, 1);
  });

  it('should render the right href', () => {
    equal(wrapper.find('a').at(0).prop('href'), `/gitterHQ/topics/topic/${topic.id}/${topic.slug}`);
  });

  it('should render the right title', () => {
    equal(wrapper.find('a').at(0).prop('title'), `View ${topic.title}`);
  });

  it('should dispatch the righ action when clicked', () => {
    const handle = spy();
    subscribe(NAVIGATE_TO_TOPIC, handle);
    wrapper.find('a').simulate('click', mockEvt);
    equal(handle.callCount, 1);
  });

});
