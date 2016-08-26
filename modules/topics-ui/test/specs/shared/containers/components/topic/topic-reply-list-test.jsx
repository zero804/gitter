import {equal} from 'assert';
import React from 'react';
import { shallow } from 'enzyme';
import TopicReplyList from '../../../../../../shared/containers/components/topic/topic-reply-list.jsx';
import replies from '../../../../../mocks/mock-data/replies';

describe('<TopicReplyList/>', () => {

  let wrapper;

  beforeEach(() => {
    wrapper = shallow(
      <TopicReplyList
      replies={replies}/>
    );
  });

  it('should render a container', () => {
    equal(wrapper.find('Container').length, 1);
  });

  it('should render a panel', () => {
    equal(wrapper.find('Panel').length, 1);
  });

  it('should render a ul', () => {
    equal(wrapper.find('ul').length, 1);
  });

  it('should render the panel with a custom class', () => {
    equal(wrapper.find('.panel--topic-reply-list').length, 1);
  });

});
