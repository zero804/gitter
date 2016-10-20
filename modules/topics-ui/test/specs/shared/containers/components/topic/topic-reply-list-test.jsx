import {equal} from 'assert';
import React from 'react';
import { shallow } from 'enzyme';
import TopicReplyList from '../../../../../../shared/containers/components/topic/topic-reply-list.jsx';
import replies from '../../../../../mocks/mock-data/replies';

describe('<TopicReplyList/>', () => {

  let wrapper;

  beforeEach(() => {
    wrapper = shallow(
      <TopicReplyList>
        {replies.map(() => <div></div>)}
      </TopicReplyList>
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

  it('should render a li for each reply', () => {
    equal(wrapper.find('li').length, replies.length);
  });

  it('should render the list with a custom class', () => {
    equal(wrapper.find('.topic-reply-list').length, 1);
  });

});
