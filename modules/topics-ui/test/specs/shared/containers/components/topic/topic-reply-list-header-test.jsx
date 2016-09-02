import {equal} from 'assert';
import React from 'react';
import { shallow } from 'enzyme';
import TopicReplyListHeader from '../../../../../../shared/containers/components/topic/topic-reply-list-header.jsx';
import replies from '../../../../../mocks/mock-data/replies';

describe('<TopicReplyListHeader/>', () => {

  let wrapper;

  beforeEach(() => {
    wrapper = shallow(
      <TopicReplyListHeader
        replies={replies}/>
    );
  });

  it('should render a container', () => {
    equal(wrapper.find('Container').length, 1);
  });

  it('should render a Panel', () => {
    equal(wrapper.find('Panel').length, 1);
  });

  it('should render tha panel with a custom class', () => {
    equal(wrapper.find('.panel--reply-list-header').length, 1);
  });

  it('should render a h1', () => {
    equal(wrapper.find('H1').length, 1);
  });

});
