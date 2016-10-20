import assert from 'assert';
import React from 'react';
import { shallow } from 'enzyme';
import TopicReplyListHeaderButton from '../../../../../../shared/containers/components/topic/topic-reply-list-header-button.jsx';

describe('<TopicReplyListHeaderButton/>', () => {

  let wrapper;

  it('should render the right class', () => {
    wrapper = shallow(<TopicReplyListHeaderButton/>);
    const result = wrapper.find('.topic-reply-list-header__filter-button')
    assert(result.length);
  });

  it('should render the right class in the active state', () => {
    wrapper = shallow(<TopicReplyListHeaderButton active={true}/>);
    const result = wrapper.find('.topic-reply-list-header__filter-button--active');
    assert(result.length);
  });

});
