import {equal} from 'assert';
import React from 'react';
import { shallow } from 'enzyme';
import TopicReplyListItem from '../../../../../../shared/containers/components/topic/topic-reply-list-item.jsx';
import replies from '../../../../../mocks/mock-data/replies.js';

describe.only('<TopicReplyListItem/>', () => {

  let wrapper;
  const reply = replies[0];

  beforeEach(() => {
    wrapper = shallow(
      <TopicReplyListItem reply={reply}/>
    );
  });

  it('should render an article', () => {
    equal(wrapper.find('article').length, 1);
  });

  it('should render a header', () => {
    equal(wrapper.find('header').length, 1);
  });

  it('should render a topic-reply-lite-item class', () => {
    equal(wrapper.find('.topic-reply-list-item').length, 1);
  });

  it('should render a topic-reply-lite-item__header class', () => {
    equal(wrapper.find('.topic-reply-list-item__header').length, 1);
  });

  it('should render a UserAvatar', () => {
    equal(wrapper.find('UserAvatar').length, 1);
  });

  it('should render a section', () => {
    equal(wrapper.find('section').length, 1);
  });

  it('should render a footer', () => {
    equal(wrapper.find('footer').length, 1);
  });

  it('should render a custom class for the body', () => {
    equal(wrapper.find('.topic-reply-list-item__body').length, 1);
  });

  it('should render a class for the sent date', () => {
     equal(wrapper.find('.topic-reply-list-item__sent').length, 1);
  });

});
