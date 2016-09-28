import {equal} from 'assert';
import React from 'react';
import { shallow } from 'enzyme';
import TopicReplyListItem from '../../../../../../shared/containers/components/topic/topic-reply-list-item.jsx';
import replies from '../../../../../mocks/mock-data/replies.js';

describe('<TopicReplyListItem/>', () => {

  let wrapper;
  const reply = replies[0];

  beforeEach(() => {
    wrapper = shallow(
      <TopicReplyListItem reply={reply}/>
    );
  });

  it('should render a FeedItem', () => {
    equal(wrapper.find('FeedItem').length, 1);
  });

  it('should render FeedItem with these footer actions');

});
